const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFSBucket } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const cors = require('cors');



const app = express();

// MongoDB URI from .env or default
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/videoStreamingDB';

// Middleware to parse JSON requests
app.use(express.json());

// Connect to MongoDB
const conn = mongoose.createConnection(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Initialize GridFSBucket
let gridFSBucket;
conn.once('open', () => {
    gridFSBucket = new GridFSBucket(conn.db, {
        bucketName: 'uploads', // Define collection name for files
    });
    console.log('MongoDB connected, GridFS initialized');
});

// Multer storage configuration for uploading files to memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
// Route to upload video
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Please upload a valid video file' });
    }

    const fileName = `video-${Date.now()}-${req.file.originalname}`;

    // Create a writable stream from the file buffer and upload to GridFS
    const uploadStream = gridFSBucket.openUploadStream(fileName, {
        contentType: req.file.mimetype || 'video/mp4',
    });

    uploadStream.write(req.file.buffer);
    uploadStream.end();

    uploadStream.on('finish', () => {
        res.json({ message: 'File uploaded successfully', filename: fileName });
    });

    uploadStream.on('error', (err) => {
        console.error('Error during file upload:', err);
        res.status(500).json({ error: 'Failed to upload file' });
    });
});

// Route to stream the video by filename
app.get('/stream/:filename', (req, res) => {
    const fileName = req.params.filename;
    console.log(`Requesting stream for file: ${fileName}`);

    // Check if file exists in the GridFS collection
    gridFSBucket.find({ filename: fileName }).toArray((err, files) => {
        if (err) {
            console.error('Error fetching file:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }

        if (!files || files.length === 0) {
            console.warn(`File not found: ${fileName}`);
            return res.status(404).json({ error: 'No file exists' });
        }

        const file = files[0];
        console.log(`Found file: ${file.filename}, Content-Type: ${file.contentType}`);

        // Check if the file is a video
        if (file.contentType.startsWith('video/')) {
            const readStream = gridFSBucket.openDownloadStreamByName(fileName);
            res.set('Content-Type', file.contentType);
            readStream.on('error', (error) => {
                console.error('Error during streaming:', error);
                res.status(500).json({ error: 'Failed to stream video' });
            });

            readStream.pipe(res)
                .on('finish', () => {
                    console.log('Streaming finished for:', fileName);
                })
                .on('error', (error) => {
                    console.error('Error while piping:', error);
                    res.status(500).json({ error: 'Failed to stream video' });
                });
        } else {
            console.warn(`Not a video file: ${fileName}`);
            return res.status(400).json({ error: 'Not a video file' });
        }
    });
});

// Route to serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Server listening on port
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
