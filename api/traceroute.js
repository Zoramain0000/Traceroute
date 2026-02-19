  import { exec } from "child_process";

export default function handler(req, res) {
  const { host } = req.query;

  if (!host) {
    return res.status(400).json({ error: "Host required" });
  }

  const command = `traceroute -m 100 ${host}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr });
    }

    const lines = stdout.split("\n").slice(1);
    const hops = [];

    lines.forEach(line => {
      const match = line.match(/^\s*(\d+)\s+([^\s]+)?\s+\(([\d\.]+)\)/);
      if (match) {
        hops.push({
          hop: parseInt(match[1]),
          host: match[2],
          ip: match[3]
        });
      }
    });

    res.status(200).json({ hops });
  });
}
