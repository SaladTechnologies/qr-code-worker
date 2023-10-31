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

## Pre-Built Images

Image Names follow the format: `saladtechnologies/<base-image>:worker<version>-<base_image_version>`.
For example, if you build worker v0.1.0 (per `package.json`) on top of `saladtechnologies/stable-fast-qr-code:0.4.0-baked`, the image name would be:
```
saladtechnologies/stable-fast-qr-code:worker0.1.0-0.4.0-baked
```

Image tags that end in `-baked` have the models baked into the image.
Those without will download the models at runtime.

### Current Images

| Image Name | Base Image | Worker Version | Backend | Models Baked In |
| ---------- | ---------- | -------------- | ------- | --------------- |
| `saladtechnologies/stable-fast-qr-code:worker0.1.0-0.4.0-baked` | `saladtechnologies/stable-fast-qr-code:0.4.0-baked` | `0.1.0` | `stable-fast-qr-code` | yes |
| saladtechnologies/stable-fast-qr-code:worker0.1.0-0.4.0 | `saladtechnologies/stable-fast-qr-code:0.4.0` | `0.1.0` | `stable-fast-qr-code` | no |