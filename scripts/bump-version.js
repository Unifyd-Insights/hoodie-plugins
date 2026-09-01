const fs = require("fs");
const path = require("path");

const version = process.argv[2];
if (!version) {
  console.error("Usage: node scripts/bump-version.js <version>");
  process.exit(1);
}

function bump(filePath, apply) {
  const fullPath = path.join(__dirname, "..", filePath);
  const json = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  apply(json);
  fs.writeFileSync(fullPath, JSON.stringify(json, null, 2) + "\n");
}

bump("plugins/hoodie/.claude-plugin/plugin.json", (json) => {
  json.version = version;
});

bump(".claude-plugin/marketplace.json", (json) => {
  json.metadata = json.metadata || {};
  json.metadata.version = version;
  for (const plugin of json.plugins || []) {
    if (plugin.name === "hoodie") {
      plugin.version = version;
    }
  }
});

console.log(`Bumped version to ${version}`);
