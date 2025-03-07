import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Transaction from './models/Transaction.js';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roxiler';

// Initialize database with seed data
app.get('/api/initialize-database', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;
    
    await Transaction.deleteMany({});
    await Transaction.insertMany(transactions.map(t => ({
      ...t,
      dateOfSale: new Date(t.dateOfSale)
    })));
    
    res.json({ message: 'Database initialized successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List transactions with search and pagination
app.get('/api/transactions', async (req, res) => {
  try {
    const { month, search = '', page = 1, perPage = 10 } = req.query;
    const skip = (page - 1) * perPage;

    const monthNumber = new Date(Date.parse(month + " 1, 2000")).getMonth() + 1;
    
    let query = {
      $expr: {
        $eq: [{ $month: "$dateOfSale" }, monthNumber]
      }
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { price: isNaN(search) ? undefined : Number(search) }
      ].filter(Boolean);
    }

    const transactions = await Transaction.find(query)
      .skip(skip)
      .limit(Number(perPage));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / perPage)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Statistics API
app.get('/api/statistics', async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = new Date(Date.parse(month + " 1, 2000")).getMonth() + 1;

    const matchStage = {
      $expr: {
        $eq: [{ $month: "$dateOfSale" }, monthNumber]
      }
    };

    const stats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSaleAmount: { $sum: "$price" },
          soldItems: { $sum: { $cond: ["$sold", 1, 0] } },
          notSoldItems: { $sum: { $cond: ["$sold", 0, 1] } }
        }
      }
    ]);

    res.json(stats[0] || {
      totalSaleAmount: 0,
      soldItems: 0,
      notSoldItems: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bar chart API
app.get('/api/bar-chart', async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = new Date(Date.parse(month + " 1, 2000")).getMonth() + 1;

    const ranges = [
      { min: 0, max: 100 },
      { min: 101, max: 200 },
      { min: 201, max: 300 },
      { min: 301, max: 400 },
      { min: 401, max: 500 },
      { min: 501, max: 600 },
      { min: 601, max: 700 },
      { min: 701, max: 800 },
      { min: 801, max: 900 },
      { min: 901, max: Infinity }
    ];

    const result = await Promise.all(
      ranges.map(async ({ min, max }) => {
        const count = await Transaction.countDocuments({
          $expr: {
            $eq: [{ $month: "$dateOfSale" }, monthNumber]
          },
          price: { $gte: min, $lt: max === Infinity ? 1000000 : max }
        });

        return {
          range: max === Infinity ? `${min}-above` : `${min}-${max}`,
          count
        };
      })
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pie chart API
app.get('/api/pie-chart', async (req, res) => {
  try {
    const { month } = req.query;
    const monthNumber = new Date(Date.parse(month + " 1, 2000")).getMonth() + 1;

    const result = await Transaction.aggregate([
      {
        $match: {
          $expr: {
            $eq: [{ $month: "$dateOfSale" }, monthNumber]
          }
        }
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(result.map(item => ({
      category: item._id,
      count: item.count
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Combined API
app.get('/api/combined-data', async (req, res) => {
  try {
    const { month } = req.query;
    
    const [transactions, statistics, barChart, pieChart] = await Promise.all([
      axios.get(`http://localhost:${PORT}/api/transactions?month=${month}`),
      axios.get(`http://localhost:${PORT}/api/statistics?month=${month}`),
      axios.get(`http://localhost:${PORT}/api/bar-chart?month=${month}`),
      axios.get(`http://localhost:${PORT}/api/pie-chart?month=${month}`)
    ]);

    res.json({
      transactions: transactions.data,
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });