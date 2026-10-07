const app = require('./app');
const cors = require('cors');
app.use(cors());
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));