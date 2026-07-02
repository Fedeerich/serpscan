import { describe, it, expect } from 'vitest';
import { analyzePerformance } from '../src/analyzers/performance.js';

describe('analyzePerformance', () => {
  it('scores a small fast page as 100', () => {
    const result = analyzePerformance('<html><head></head><body>ok</body></html>', 200);
    expect(result.score).toBe(100);
  });

  it('flags slow response as critical over 3000ms', () => {
    const result = analyzePerformance('<html></html>', 3500);
    expect(result.issues.some(i => i.severity === 'critical' && i.message.includes('Slow'))).toBe(true);
  });

  it('detects render-blocking scripts in head', () => {
    const html = '<html><head><script src="app.js"></script></head><body></body></html>';
    const result = analyzePerformance(html, 200);
    expect(result.issues.some(i => i.message.includes('render-blocking'))).toBe(true);
  });

  it('does not flag deferred/async scripts', () => {
    const html = '<html><head><script defer src="a.js"></script><script async src="b.js"></script></head></html>';
    const result = analyzePerformance(html, 200);
    expect(result.issues.some(i => i.message.includes('render-blocking'))).toBe(false);
  });

  it('detects mixed content (http resources)', () => {
    const html = '<html><body><img src="http://insecure.com/a.png"></body></html>';
    const result = analyzePerformance(html, 200);
    expect(result.issues.some(i => i.severity === 'critical' && i.message.includes('HTTP'))).toBe(true);
  });
});
