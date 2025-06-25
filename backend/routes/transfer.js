const express = require('express');
const router = express.Router();
const db = require('../db');

// 创建转账记录（用户 A 离线签名并提交）
router.post('/create', async (req, res) => {
  const { sender, receiver, token, amount, deadline, signature } = req.body;

  try {
    await db.query(
      `INSERT INTO transfers (sender, receiver, token, amount, deadline, signature, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [sender, receiver, token, amount, deadline, signature]
    );
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Create error:', err);
    res.status(500).json({ error: 'DB insert error' });
  }
});

// 获取 B 用户的待收款记录
router.get('/pending/:receiver', async (req, res) => {
  const { receiver } = req.params;

  try {
    const result = await db.query(
      `SELECT * FROM transfers WHERE receiver = $1 AND status = 'pending'`,
      [receiver]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: 'DB fetch error' });
  }
});

// 用户 B 点击“收款”后更新状态为 claimed
router.put('/claim/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(`UPDATE transfers SET status = 'claimed' WHERE id = $1`, [id]);
    res.json({ status: 'claimed' });
  } catch (err) {
    console.error('Claim error:', err);
    res.status(500).json({ error: 'DB update error' });
  }
});