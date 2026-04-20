import { createVidak } from "./vidak";

console.time("time");
let vidak = createVidak();

vidak.render();

console.timeEnd("time");

const app = document.getElementById("app");

// console.time("time");
// const arr = new Array(100_000_000).fill(0).map((x, i) => Math.sin(i));
// console.timeEnd("time");

// for (let i = 0; i < 100; i++) {
//   console.log(arr[i]);
// }

app?.appendChild(vidak.getCanvas());
