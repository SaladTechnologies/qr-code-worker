# qr-code-worker
This is a queue worker for generating stable diffusion qr codes with any of a variety of stable diffusion backends.


## Build
```bash
# Usage: ./build --backend <backend> --base-image <base_image>
./build --backend stable-fast-qr-code --base-image saladtechnologies/stable-fast-qr-code:0.4.0-baked
```

## Run
```bash
docker compose up
```