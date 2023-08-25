import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import * as tfNode from "@tensorflow/tfjs-node";
import path from "path"; // เพิ่ม path module
import { detectImage } from "./detect.js";


const app = express();
const port = 3001;

// โมเดลที่ใช้ในการตรวจจับวัตถุ
const model = {
  net: null,
  inputShape: [1, 0, 0, 3],
};
const classThreshold = 0;
const [modelWidth, modelHeight] = model.inputShape.slice(1, 3);
// cors เพื่ออนุญาติการเข้าถึงapi
app.use(cors());
const corsOptions = {
  origin: "http://localhost:5173",
};
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: "10mb" }));

// Middleware เพื่อให้ Express เข้าถึงไฟล์ในโฟลเดอร์ public
const __dirname = path.resolve(); // เพิ่มบรรทัดนี้
app.use(express.static(path.join(__dirname, "public")));

async function loadModel() {
  await tfNode.ready();

  const modelName = "fishtrainIV0.89_web_model";
  const modelUrl = `http://127.0.0.1:3001/${modelName}/model.json`; // URL ของโมเดลบนเว็บเซิร์ฟเวอร์ BackEnd\public\fishtrainIV0.89_web_model

  const yolov5 = await tfNode.loadGraphModel(modelUrl); // โหลดโมเดลจาก URL
  console.log("warming up model");
  // warming up model
  const dummyInput = tfNode.zeros(yolov5.inputs[0].shape);
  const warmupResult = await yolov5.executeAsync(dummyInput);
  // console.log("dummyInput: ",dummyInput.print())
  // console.log("warmupResult: ",warmupResult[1].dataSync())
  tfNode.dispose(warmupResult); // cleanup memory
  tfNode.dispose(dummyInput); // cleanup memory

  model.net = yolov5;
  model.inputShape = yolov5.inputs[0].shape;
  console.log("Model loaded");
}
//load model เมื่อ start server
loadModel();

app.post("/upload", (req, res) => {
  const { base64String } = req.body; // ดึงค่า base64String จาก req.body
  // console.log('Base64 data from client:', base64String.length);

  if (base64String) {
    const imageBuffer = Buffer.from(base64String, "base64");
    // const imageData = new Uint8Array(imageBuffer); // แปลงเป็น Uint8Array
    // const inputImage = tf.browser.fromPixels({ data: imageBuffer, width: modelWidth, height: modelHeight }); // สร้างรูปภาพจาก Uint8Array
    const inputImage = tfNode.node.decodeImage(imageBuffer); 
    // console.log(inputImage.print())
    const imageName = "CaptureImage.jpg"; // ชื่อไฟล์ที่ต้องการ
    fs.writeFileSync(`Image/${imageName}`, imageBuffer);
    console.log("Image saved successfully.");
      // เรียกใช้ detectImage จาก detect.js เพื่อนับจำนวนวัตถุที่ตรวจพบ
    detectImage(inputImage, model, classThreshold, imageBuffer);
    res.send("detected");
  } else {
    console.error("Invalid base64String.");
    res.status(400).send("Invalid base64String.");
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
