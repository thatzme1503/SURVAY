const express = require('express');
const DataManager = require('./src/dataManager');
const path = require('path');
const app = express();
const PORT = process.env.DATA_MANAGER_PORT || 3001;

const dataManager = new DataManager();

app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/stats', (req, res) => {
  res.json(dataManager.getStatistics());
});

app.get('/api/data/:category', (req, res) => {
  const category = req.params.category;
  const data = dataManager.data[category];
  res.json(data || {});
});

app.post('/api/data/:category', (req, res) => {
  const category = req.params.category;
  const { action, item, subCategory } = req.body;
  
  try {
    switch (action) {
      case 'add':
        if (category === 'proxies') {
          if (dataManager.validateProxy(item)) {
            dataManager.addProxy(item, subCategory);
            res.json({ success: true, message: 'Proxy added' });
          } else {
            res.status(400).json({ success: false, message: 'Invalid proxy format' });
          }
        } else if (category === 'emails') {
          if (dataManager.validateEmail(item)) {
            dataManager.addEmail(item, subCategory);
            res.json({ success: true, message: 'Email added' });
          } else {
            res.status(400).json({ success: false, message: 'Invalid email format' });
          }
        } else if (category === 'phones') {
          if (dataManager.validatePhone(item)) {
            dataManager.addPhone(item, subCategory);
            res.json({ success: true, message: 'Phone added' });
          } else {
            res.status(400).json({ success: false, message: 'Invalid phone format' });
          }
        } else if (category === 'storeNumbers') {
          if (dataManager.validateStoreNumber(item)) {
            dataManager.addStoreNumber(item, subCategory);
            res.json({ success: true, message: 'Store number added' });
          } else {
            res.status(400).json({ success: false, message: 'Invalid store number format' });
          }
        } else {
          dataManager.addName(item, subCategory);
          res.json({ success: true, message: 'Item added' });
        }
        break;
      
      case 'remove':
        if (category === 'proxies') {
          dataManager.removeProxy(item, subCategory);
        } else if (category === 'emails') {
          dataManager.removeEmail(item, subCategory);
        } else if (category === 'phones') {
          dataManager.removePhone(item, subCategory);
        } else {
          // Generic remove
          const data = dataManager.data[category];
          if (data && data[subCategory]) {
            data[subCategory] = data[subCategory].filter(i => i !== item);
            dataManager.saveDataFile(category);
          }
        }
        res.json({ success: true, message: 'Item removed' });
        break;
      
      case 'mark-used':
        if (category === 'emails') {
          dataManager.markEmailUsed(item);
        } else if (category === 'phones') {
          dataManager.markPhoneUsed(item);
        } else if (category === 'storeNumbers') {
          dataManager.markStoreNumberUsed(item);
        }
        res.json({ success: true, message: 'Item marked as used' });
        break;
      
      default:
        res.status(400).json({ success: false, message: 'Unknown action' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/bulk/:category', (req, res) => {
  const category = req.params.category;
  const { items } = req.body;
  
  try {
    dataManager.importData(category, items);
    res.json({ success: true, message: `Imported ${items.length} items` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete('/api/data/:category', (req, res) => {
  const category = req.params.category;
  
  try {
    dataManager.clearCategory(category);
    res.json({ success: true, message: `Cleared ${category}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/export/:category', (req, res) => {
  const category = req.params.category;
  const data = dataManager.exportData(category);
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=${category}.json`);
  res.send(JSON.stringify(data, null, 2));
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Data Manager Web Interface running at http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
