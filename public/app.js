async function startTrace() {
  const host = document.getElementById("host").value;
  const resultsDiv = document.getElementById("results");
  const canvas = document.getElementById("topology");
  const ctx = canvas.getContext("2d");

  resultsDiv.innerHTML = "Tracing...";
  canvas.width = 800;
  canvas.height = 600;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const res = await fetch(`/api/traceroute?host=${host}`);
  const data = await res.json();

  resultsDiv.innerHTML = "";

  let y = 50;

  data.hops.forEach((hop, index) => {
    resultsDiv.innerHTML += `
      <div>
        Hop ${hop.hop} → ${hop.host} (${hop.ip})
      </div>
    `;

    ctx.fillStyle = "#00ffcc";
    ctx.beginPath();
    ctx.arc(400, y, 8, 0, Math.PI * 2);
    ctx.fill();

    if (index > 0) {
      ctx.strokeStyle = "#00ffcc";
      ctx.moveTo(400, y - 50);
      ctx.lineTo(400, y);
      ctx.stroke();
    }

    y += 50;
  });
}
