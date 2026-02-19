
  import { RealTraceroute } from '../lib/traceroute.js';

export default async function handler(req, res) {
  // ... same SSE headers as before ...
  
  const target = url.searchParams.get('target');
  
  res.write('data: ' + JSON.stringify({ status: 'tracing', target }) + '\n\n');
  
  try {
    // REAL TRACEROUTE via library
    const fullTrace = await RealTraceroute.trace(target, { 
      maxHops: 64, 
      timeout: 120000 
    });
    
    // Stream each hop progressively
    for (let i = 0; i < fullTrace.length; i++) {
      const hopData = fullTrace[i];
      res.write(`data: ${JSON.stringify({
        hop: hopData.hop,
        latest: hopData,
        path: fullTrace.slice(Math.max(0, i-9), i+1),
        complete: i === fullTrace.length - 1
      })}\n\n`);
      
      await new Promise(r => setTimeout(r, 100)); // Stream pacing
    }
    
  } catch (error) {
    res.write('data: ' + JSON.stringify({ error: error.message }) + '\n\n');
  }
  
  res.end();
}
