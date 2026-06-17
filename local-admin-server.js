const express = require("express");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");

app.use(express.json({ limit: "50mb" }));
app.use(express.static(ROOT));

function safeDataPath(fileName) {
  const allowed = new Set(["schedule.json", "library.json", "settings.json"]);
  if (!allowed.has(fileName)) throw new Error("Ficheiro não permitido.");
  return path.join(DATA_DIR, fileName);
}

function readJson(fileName) {
  const filePath = safeDataPath(fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(fileName, data) {
  const filePath = safeDataPath(fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function runGitCommit(files, message) {
  return new Promise((resolve, reject) => {
    const quotedFiles = files.map((f) => `data/${f}`).join(" ");
    const safeMessage = message.replace(/"/g, "'");
    const cmd = `git add ${quotedFiles} && git commit -m "${safeMessage}" && git push`;

    exec(cmd, { cwd: ROOT }, (error, stdout, stderr) => {
      const output = `${stdout || ""}\n${stderr || ""}`.trim();

      if (error) {
        // If nothing changed, git commit exits non-zero. Treat it as a friendly response.
        if (output.includes("nothing to commit") || output.includes("no changes added")) {
          return resolve({ skipped: true, output });
        }
        return reject(new Error(output || error.message));
      }

      resolve({ skipped: false, output });
    });
  });
}

app.get("/api/data", (req, res) => {
  try {
    res.json({
      ok: true,
      schedule: readJson("schedule.json"),
      library: readJson("library.json"),
      settings: readJson("settings.json")
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/save", async (req, res) => {
  try {
    const { schedule, library, settings, publishToGit = true } = req.body;
    const changedFiles = [];

    if (schedule) {
      schedule.version = Date.now();
      schedule.updatedAt = new Date().toISOString();
      writeJson("schedule.json", schedule);
      changedFiles.push("schedule.json");
    }

    if (library) {
      library.version = Date.now();
      library.updatedAt = new Date().toISOString();
      writeJson("library.json", library);
      changedFiles.push("library.json");
    }

    if (settings) {
      settings.version = Date.now();
      settings.updatedAt = new Date().toISOString();
      writeJson("settings.json", settings);
      changedFiles.push("settings.json");
    }

    if (!changedFiles.length) {
      return res.status(400).json({ ok: false, error: "Nada para guardar." });
    }

    let git = null;
    if (publishToGit) {
      git = await runGitCommit(changedFiles, "Atualizar programação KoriTV");
    }

    res.json({ ok: true, changedFiles, git });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/git-push", async (req, res) => {
  try {
    const git = await runGitCommit(["schedule.json", "library.json", "settings.json"], "Atualizar KoriTV");
    res.json({ ok: true, git });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`KoriTV Admin local: http://localhost:${PORT}/admin.html`);
  console.log(`KoriTV Canal local: http://localhost:${PORT}/index.html`);
});
