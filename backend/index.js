const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const { uploadFileToIPFS, uploadJSONToIPFS } = require("./ipfs");
const db = require("./db");

require("dotenv").config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

const upload = multer({ dest: "uploads/" });

// 表单上传页面
app.get("/upload", (req, res) => {
  res.render("upload", { tokenURI: null, error: null });
});

// 表单上传逻辑
app.post("/upload", upload.single("avatar"), async (req, res) => {
  try {
    const { name, description, twitter, note } = req.body;
    const imagePath = req.file.path;

    const imageURI = await uploadFileToIPFS(imagePath);
    const metadata = {
      name,
      description,
      image: imageURI,
      attributes: [
        { trait_type: "Twitter", value: twitter },
        { trait_type: "备注", value: note },
      ],
    };
    const metadataURI = await uploadJSONToIPFS(metadata);

    fs.unlinkSync(imagePath);

    res.json({ success: true, tokenURI: metadataURI, message: "上传成功" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message, message: "上传失败" });
  }
});

// 📝 创建签名转账记录（用户A发起）
app.post("/api/transfer/create", async (req, res) => {
  const {
    from_address,
    to_address,
    token_address,
    amount,
    deadline,
    v,
    r,
    s,
    sig_v,
    sig_r,
    sig_s
  } = req.body;

  console.log("接收到的参数:", req.body);

  try {
    await db.query(
      `INSERT INTO transfers1 (
        from_address, to_address, token_address, amount, deadline,
        v, r, s,
        sig_v, sig_r, sig_s,
        status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')`,
      [
        from_address,
        to_address,
        token_address,
        amount,
        deadline,
        v,
        r,
        s,
        sig_v,
        sig_r,
        sig_s
      ]
    );

    res.json({ status: "ok" });
  } catch (err) {
    console.error("❌ Create error:", err);
    res.status(500).json({ error: "数据库插入失败" });
  }
});

// 📬 用户B：获取待收款记录
app.get("/api/transfer/:receiver", async (req, res) => {
  const { receiver } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM transfers1 WHERE LOWER(to_address) = LOWER($1) ORDER BY created_at DESC`,
      [receiver]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "DB fetch error" });
  }
});

// ✅ 用户B：确认收款后更新状态
app.put("/api/transfer/claim/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`UPDATE transfers1 SET status = 'claimed' WHERE id = $1`, [id]);
    res.json({ status: "claimed" });
  } catch (err) {
    console.error("Claim error:", err);
    res.status(500).json({ error: "DB update error" });
  }
});

// 📤 用户A：获取自己发起的记录
app.get("/api/transfer/sent/:sender", async (req, res) => {
  const { sender } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM transfers1 WHERE LOWER(from_address) = LOWER($1) ORDER BY created_at DESC`,
      [sender]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Sender query error:", err);
    res.status(500).json({ error: "DB fetch error" });
  }
});

app.listen(port, () => {
  console.log(`✅ WalletCard server running at http://localhost:${port}`);
});