import { exec } from 'child_process';


export function getGPUInfo(): Promise<{name: string, vram: number}> {
  return new Promise((resolve, reject) => {
    exec("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader", (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        const [name, vram] = stdout.trim().split(", ");
        const vramGB = parseInt(vram) / 1024;
        // Round to 2 decimal places
        const roundedVram = Math.round(vramGB * 100) / 100;
        resolve({name, vram: roundedVram});
      }
    });
  });
}