import traceroute from 'traceroute';
import { execa } from 'execa';

/**
 * Production traceroute library - uses system traceroute + fallback
 */
export class RealTraceroute {
  
  static async trace(target, options = {}) {
    const { maxHops = 64, timeout = 120000 } = options;
    
    try {
      // METHOD 1: Node traceroute lib (ICMP/UDP)
      const trace = traceroute.trace(target, {
        maxHops,
        timeout: 5000,
        retries: 3
      });
      
      return await this.streamTraceroute(trace, target);
      
    } catch (libError) {
      // METHOD 2: System traceroute fallback (most reliable)
      return await this.systemTraceroute(target, maxHops, timeout);
    }
  }
  
  static async streamTraceroute(traceStream, target) {
    const results = [];
    
    return new Promise((resolve, reject) => {
      traceStream.on('data', (hop) => {
        const hopData = {
          hop: hop.hopNumber,
          ip: hop.ip || '*',
          rtt: hop.rtts?.[0] || 0,
          ttl: hop.hopNumber,
          status: hop.ip ? 'live' : 'timeout',
          reachedTarget: hop.ip?.includes(target.split('.')[0])
        };
        results.push(hopData);
      });
      
      traceStream.on('end', () => resolve(results));
      traceStream.on('error', reject);
    });
  }
  
  static async systemTraceroute(target, maxHops = 64, timeout = 120000) {
    const results = [];
    
    // Execute system traceroute with custom TTL streaming
    const { stdout } = await execa('traceroute', [
      '-n',           // numeric IPs
      '-q', '1',      // 1 probe per hop
      '-m', maxHops,  // max hops
      '-w', '3',      // 3s timeout per probe
      target
    ], { timeout });
    
    // Parse REAL traceroute output
    const lines = stdout.split('\n');
    lines.forEach((line, i) => {
      if (line.match(/^\s*\d+\s+/)) {
        const hop = parseInt(line.match(/^\s*(\d+)/)?.[1] || i + 1);
        const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+)/);
        const rttMatch = line.match(/(\d+(?:\.\d+)?) ms/);
        
        results.push({
          hop,
          ip: ipMatch?.[1] || '*',
          rtt: parseFloat(rttMatch?.[1] || '0'),
          ttl: hop,
          status: ipMatch ? 'live' : 'timeout'
        });
      }
    });
    
    return results;
  }
}
