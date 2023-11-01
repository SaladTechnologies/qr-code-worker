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

### Current Images

| Image Name | Base Image | Worker Version | Backend | Models Baked In |
| ---------- | ---------- | -------------- | ------- | --------------- |
| `saladtechnologies/stable-fast-qr-code:worker0.1.0-0.4.0-baked` | `saladtechnologies/stable-fast-qr-code:0.4.0-baked` | `0.1.0` | `stable-fast-qr-code` | yes |
| `saladtechnologies/stable-fast-qr-code:worker0.1.0-0.4.0` | `saladtechnologies/stable-fast-qr-code:0.4.0` | `0.1.0` | `stable-fast-qr-code` | no |
| `saladtechnologies/sdnext:worker0.1.0-122143-128713` | `saladtechnologies/sdnext:122143-128713` | `0.1.0` | `sdnext` | yes |
| `saladtechnologies/sdnext:worker0.1.0-dynamic` | `saladtechnologies/sdnext:dynamic` | `0.1.0` | `sdnext` | no |


## Environment Variables

| Name | Description | Default |
| ---- | ----------- | ------- |
| QUEUE_NAME | The name of the queue to get jobs from | **REQUIRED** |
| QUEUE_URL | The URL of the queue to get jobs from | **REQUIRED** |
| QUEUE_API_KEY | The API key for the queue | **REQUIRED** |
| BENCHMARK_ID | The ID of the benchmark to report results to | **REQUIRED** |
| REPORTING_URL | The URL to report results to | **REQUIRED** |
| REPORTING_API_KEY | The API key for the reporting endpoint | **REQUIRED** |
| IMAGE_SIZE | The size of the qr image to generate | `512` |
| STARTUP_CHECK_INTERVAL | The interval in ms to check for the image generation service liveness | `1000` |
| STARTUP_CHECK_MAX_TRIES | The maximum number of times to check for the image generation service liveness | `300` |
| EAGER_NUMBER | The number of jobs to keep locally pre-fetched | `2` |