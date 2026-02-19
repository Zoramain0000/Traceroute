import { execa } from 'execa';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = new URL(req.url, `http://${req.headers.host}`);
  const target = url.searchParams.get('target') || '8.8.8.8';
  const maxHops = parseInt(url.searchParams.get('maxHops')) || 999;

  res.write(`data: ${JSON.stringify({status: 'starting', target})}\n\n`);

  let hopCount = 0;
  const results = [];

  try {
    // INFINITE HOP TRACEROUTE - TTL 1-NNN
    while (hopCount < maxHops) {
      hopCount++;
      
      // REAL TTL TRACEROUTE PROBE
      const { stdout, stderr } = await execa('traceroute', [
        '-n', '-q', '1', '-w', '2', '-m', hopCount.toString(), '-t', hopCount.toString(), target
      ], { timeout: 8000 });

      // Parse REAL traceroute output
      const hops = this.parseTracerouteOutput(stdout, hopCount, target);
      results.push(...hops);

      // STREAM LIVE TOPOLOGY
      res.write(`data: ${JSON.stringify({
        hop: hopCount,
        hops: hops,
        topology: results,
        complete: false,
        targetReached: hops.some(h => h.reachedTarget)
      })}\n\n`);

      // Continue infinitely or stop on target
      if (hops.some(h => h.reachedTarget)) {
        res.write(`data: ${JSON.stringify({complete: true, totalHops: hopCount})}\n\n`);
        break;
      }

      // Progressive delay for live streaming
      await new Promise(r => setTimeout(r, 150));
    }
  } catch (error) {
    res.write(`data: ${JSON.stringify({error: error.message})}\n\n`);
  }

  res.end();
}

parseTracerouteOutput(stdout, ttl, target) {
  const hops = [];
  const lines = stdout.split('\n');
  
  lines.forEach(line => {
    const hopMatch = line.match(/^(\s*\d+)\s+(\d+\.\d+\.\d+\.\d+)/);
    const rttMatch = line.match(/(\d+(?:\.\d+)?(?:\s+ms)?)/g);
    
    if (hopMatch) {
      const ip = hopMatch[2];
      const rtt = rttMatch ? parseFloat(rttMatch[0]) : 0;
      
      hops.push({
        hop: parseInt(hopMatch[1]),
        ip,
        rtt,
        ttl,
        reachedTarget: ip.includes(target.split('.')[0]),
        timestamp: Date.now()
      });
    }
  });
  
  return hops;
}
