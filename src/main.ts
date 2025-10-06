import '@/style.css';
import {ui} from "./ui.ts";
import {setupScene} from "./scene.ts";
import {storage} from "./storage.ts";
import {eggs} from "./util";


await storage.init()
setupScene()
ui.loadUI()

eggs()
