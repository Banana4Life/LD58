import '@/style.css';
import {loadUI} from "./ui.ts";
import {setupScene} from "./scene.ts";
import {storage} from "./storage.ts";


setupScene()
await storage.init()
loadUI()
