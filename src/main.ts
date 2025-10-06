import '@/style.css';
import {ui} from "./ui.ts";
import {setupScene} from "./scene.ts";
import {storage} from "./storage.ts";

await storage.init()
setupScene()
ui.loadUI()
