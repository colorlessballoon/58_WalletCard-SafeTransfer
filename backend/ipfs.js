const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
require("dotenv").config();

const PINATA_BASE = "https://api.pinata.cloud";

async function uploadFileToIPFS(filePath) {
  const data = new FormData();
  data.append("file", fs.createReadStream(filePath));

  const res = await axios.post(`${PINATA_BASE}/pinning/pinFileToIPFS`, data, {
    maxBodyLength: "Infinity",
    headers: {
      ...data.getHeaders(),
      Authorization: process.env.PINATA_JWT,
    },
  });

  return `ipfs://${res.data.IpfsHash}`;
}

async function uploadJSONToIPFS(json) {
  const res = await axios.post(
    `${PINATA_BASE}/pinning/pinJSONToIPFS`,
    json,
    {
      headers: {
        Authorization: process.env.PINATA_JWT,
        "Content-Type": "application/json",
      },
    }
  );
  return `ipfs://${res.data.IpfsHash}`;
}

module.exports = {
  uploadFileToIPFS,
  uploadJSONToIPFS,
};