import * as tf from "@tensorflow/tfjs-node";
import { createCanvas, loadImage } from "canvas";
// import sharp from 'sharp';
import fs from "fs/promises";
import gm from "gm";

const imagePath = "./Image/CaptureImage.jpg";

const preprocess = (source, modelWidth, modelHeight) => {
  let xRatio, yRatio; // ratios for boxes
  const input = tf.tidy(() => {
    // const img = tf.browser.fromPixels(source);
    const img = source;

    // padding image to square => [n, m] to [n, n], n > m
    const [h, w] = img.shape.slice(0, 2);
     // get source width and height
     // get source width and height
    const maxSize = Math.max(w, h); // get max size
    const imgPadded = img.pad([
      [0, maxSize - h], // padding y [bottom only]
      [0, maxSize - w], // padding x [right only]
      [0, 0],
    ]);
    xRatio = maxSize / w; // update xRatio
    yRatio = maxSize / h; // update yRatio

    return tf.image
      .resizeBilinear(imgPadded, [modelWidth, modelHeight]) // resize frame
      .div(255.0) // normalize
      .expandDims(0); // add batch
  });
  // console.log("img ",input)

  return [input, xRatio, yRatio];
};
// const drawImage = () => {
//   const imageBuffer = fs.readFile(imagePath);
//   const image = loadImage(imageBuffer);
//   const canvas = createCanvas(image.width, image.height);
//   const context = canvas.getContext('2d');
//   // วาดเส้นบน Canvas
//   context.drawImage(image, 0, 0);
//   context.beginPath();
//   context.moveTo(10, 10); // จุดเริ่มต้น
//   context.lineTo(100, 100); // จุดสิ้นสุด
//   context.lineWidth = 5; // ความหนาของเส้น
//   context.stroke(); // วาดเส้น
//   context.strokeStyle = 'red'; // สีของเส้น
//   console.log(imagePath)
//   console.log("Draw Success")
// }
export const detectImage = (imgSource, model, classThreshold, imageBuffer) => {
  const [modelWidth, modelHeight] = model.inputShape.slice(1, 3); // get model width and height
  tf.engine().startScope(); // start scoping tf engine
  const [input, xRatio, yRatio] = preprocess(
    imgSource,
    modelWidth,
    modelHeight
  );
  // console.log("imgSource: ", imgSource);
  // console.log("input: ", input);

  model.net.executeAsync(input).then((res) => {
    // for(let i=0;i<res.length;i++){
    //   console.log(res[i].bbox)
    // }
    //const [boxes, scores, classes] = res.slice(0, 3);
    const [boxes, scores, classes, num] = res.slice();
    const class_data = classes.dataSync();
    const boxes_data = boxes.dataSync();
    const scores_data = scores.dataSync();
    const num_data = num.dataSync();

    const pic = gm(imagePath);

    for (let i = 0; i < scores_data.length; ++i) {
      if (scores_data[i] > classThreshold) {
        // console.log("scores_data: ", scores_data[i]);
        let [xmin, ymin, xmax, ymax] = boxes_data.slice(i * 4, (i + 1) * 4);
        xmin *= 640 * xRatio;
        xmax *= 640 * xRatio;
        ymin *= 480 * yRatio;
        ymax *= 480 * yRatio;

        const boxWidth = xmax - xmin;
        const boxHeight = ymax - ymin;
        // console.log(xRatio);
        // console.log(yRatio);
        // console.log(ymax);
        // console.log(xmax);
        // pic.fill("red", (err) => {
        //   if (!err) console.log("draw successful");
        // });
        // pic.stroke("#ff0000", 2, (err) => {
        //   if (!err) console.log("draw successful");
        // });
        // // pic.drawLine(100, 30, 400, 80)
        // pic.drawRectangle(xmin, ymin, xmin + boxWidth, ymin + boxHeight, (err) => {
        //   if (err) console.log(err);
        // });
        pic.stroke("#ff0000", 2).fill("None").drawRectangle(xmin, ymin, xmin + boxWidth, ymin + boxHeight)
        // console.log("draw successful")
        // const className = "Fish";
        // const score = scores_data[i];
        // const text = `${className} (${Math.round(score * 100)}%)`;
        // 
        // pic.stroke("#ff0000", 1);
        // pic.fontSize(16);
        // pic.drawText(xmin + 5, ymin + 16, text);
      }
    }
    console.log("Count: ", num_data[0]);

    const outputImagePath = "./Image/CaptureImageWithBoxes.jpg";
    pic.write(outputImagePath, (err) => {
      if (!err) console.log("draw successful");
    });
    // const classes_data = classes.dataSync();

    tf.dispose(res); // clear memory
  });
  tf.engine().endScope(); // end of scoping
};

// scores_data.forEach((score) => {
//   if (score > classThreshold) {
//     console.log("+++++++++++++++++scores: ", score);
//   } else {
//     console.log("scores: ", score);
//   }
// });
// class_data.forEach((classs) => {
//   console.log("+++++++++++++++++classs: ", classs);
// });

//
// console.log("boxes_data",boxes_data)
