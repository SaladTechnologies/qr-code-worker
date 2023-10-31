# qr-code-worker
This is a queue worker for generating stable diffusion qr codes with any of a variety of stable diffusion backends.

Currently Supported Backends:
- [x] [stable-fast-qr-code](https://github.com/SaladTechnologies/stable-fast-qr-demo)
- [ ] [a1111](https://github.com/SaladTechnologies/a1111-dynamic)
- [ ] [sdnext](https://github.com/SaladTechnologies/sdnext-dynamic)
- [ ] [comfy](https://github.com/SaladTechnologies/comfyui-dynamic)
- [ ] invoke

## Build
```bash
# Usage: ./build --backend <backend> --base-image <base_image>
./build --backend stable-fast-qr-code --base-image saladtechnologies/stable-fast-qr-code:0.4.0-baked
```

## Run
```bash
docker compose up
```