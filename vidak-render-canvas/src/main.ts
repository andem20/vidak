import { createVidak } from "./vidak";

const vidak = createVidak();

vidak.render();

const app = document.getElementById("app");

app?.appendChild(vidak.getCanvas());
