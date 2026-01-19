const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;


app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));


app.post('/api/backup', (req, res) => {
  try {
    const backupData = req.body;

    
    
    const backupDir = path.join(__dirname, 'Backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    
    const filePath = path.join(backupDir, 'CenterFive_Backup.json');
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

    console.log('Backup saved successfully at', new Date().toISOString());
    res.status(200).json({ message: 'Backup saved successfully' });
  } catch (error) {
    console.error('Error saving backup:', error);
    res.status(500).json({ error: 'Failed to save backup' });
  }
});

app.listen(PORT, () => {
  console.log(`Backup server running on port ${PORT}`);
});