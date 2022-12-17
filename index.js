const { app, BrowserWindow, ipcMain } = require("electron");
const { LaunchGame, RobloxRequest } = require("robloxlauncherapi");
const { exec } = require("child_process");
const axios = require("axios");
const fs = require("fs");
const download = require("download");

async function multiRoblox() {
  if (!fs.existsSync(process.env.APPDATA + "/roam")) {
    fs.mkdirSync(process.env.APPDATA + "/roam");
  }

  if (!fs.existsSync("multiroblox.exe")) {
    await download(
      "https://github.com/abrahampo1/ROAM/raw/master/multiroblox.exe",
      process.env.APPDATA + "/roam"
    );
  }
  exec(process.env.APPDATA + "/roam/multiroblox.exe");
}

multiRoblox();

let ContentWindow;

function createWindow() {
  let mainWindow = new BrowserWindow({
    width: 900,
    height: 500,
    resizable: false,
    autoHideMenuBar: true,
    maximizable: false,
    minimizable: false,
    closable: true,
    title: false,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("src/index.html");

  ipcMain.on("close", () => {
    exec(`taskkill /F /IM multiroblox.exe`);
    mainWindow.close();
  });

  return mainWindow;
}

app.whenReady().then(() => {
  ContentWindow = createWindow();
});

ipcMain.on("AddRobloxAccount", () => {
  let accountWindow = new BrowserWindow({
    height: 900,
    width: 900,
  });

  accountWindow.loadURL("https://www.roblox.com/login");

  accountWindow.webContents.session
    .clearStorageData({ storages: ["cookies"] })
    .then(() => {})
    .catch((error) => {
      console.error("Failed to clear cookies: ", error);
    });
  accountWindow.once("ready-to-show", () => {
    accountWindow.on("page-title-updated", (data) => {
      accountWindow.webContents.session.cookies.get({}).then((cookies) => {
        cookies.forEach((cookie) => {
          if (cookie.name == ".ROBLOSECURITY") {
            ContentWindow.webContents.send("RobloxAccountCookie", cookie.value);
            accountWindow.close();
          }
        });
      });
    });
  });
});

ipcMain.on("LaunchGame", (sender, data) => {
  LaunchGame(data.cookie, data.placeId, data.followPlayer)
    .then((r) => {
      ContentWindow.webContents.send("LauncherLink", r);
    })
    .catch((r) => {
      console.log(r);
    });
});

const formUrlEncoded = (x) =>
  Object.keys(x).reduce((p, c) => p + `&${c}=${encodeURIComponent(x[c])}`, "");

ipcMain.on("BlockRobloxUser", (res, data) => {
  RobloxRequest(
    `https://accountsettings.roblox.com/v1/users/${data.uid}/block`,
    data.cookie,
    "POST"
  );
});

ipcMain.on("RobloxRequest", async (res, data) => {
  let cb = await RobloxRequest(data.url, data.cookie, data.method);
  cb.data["uid"] = data.uid;
  ContentWindow.webContents.send(data.cb, cb.data);
});
