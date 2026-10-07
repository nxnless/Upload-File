// src/app.js
const express = require('express');
const fileRoutes = require('./routes/files');
const errorHandler = require('./middlewares/errorHandler');

console.log('fileRoutes:', typeof fileRoutes); // ควรขึ้นว่า 'function'
console.log('errorHandler:', typeof errorHandler); // ควรขึ้นว่า 'function'

const app = express();
app.use(express.json());
app.use('/api/files', fileRoutes);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

module.exports = app;