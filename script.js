async function initWebGPU() {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();
    return device;
}

async function loadShader(f) {
    const response = await fetch(f);
    const shaderCode = await response.text();
    return shaderCode;
}

let reSize = new ResizeObserver(en => {
    en.forEach(e => {
        e.target.height = window.innerHeight * window.devicePixelRatio;
        e.target.width = window.innerWidth * window.devicePixelRatio;
    });
});

let canvas = document.querySelector('#cv');

reSize.observe(canvas);

async function initCanvas() {
    const device = await initWebGPU();

    const context = canvas.getContext('webgpu');

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode:"premultiplied" });

    const module = device.createShaderModule({
        label: 'our hardcoded red triangle shaders',
        code: await loadShader('wave.wgsl'),
    });
    
    const renderPassDescriptor = {
        label: 'our basic canvas renderPass',
        colorAttachments: [
            {
                // view: <- to be filled out when we render
                clearValue: [0, 0, 0, 0],
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
    }; 

    const pipeline = device.createRenderPipeline({
        label: 'our hardcoded red triangle pipeline',
        layout: 'auto',
        vertex: {
            module,
        },
        fragment: {
            module,
            targets: [{ format: format }],
        },
    });

    function render() {
        renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture().createView();

        // make a command encoder to start encoding commands
        const encoder = device.createCommandEncoder({ label: 'our encoder' });
    
        // make a render pass encoder to encode render specific commands
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.draw(6);
        pass.end();
    
        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        requestAnimationFrame(render);
    }

    render();
}

initCanvas();