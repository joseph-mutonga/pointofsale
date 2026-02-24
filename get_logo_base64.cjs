const fs = require('fs');
const path = require('path');
const imagePath = path.join(__dirname, 'src', 'assets', 'logo.png');
const imageData = fs.readFileSync(imagePath);
const base64Image = imageData.toString('base64');
console.log('data:image/png;base64,' + base64Image);
