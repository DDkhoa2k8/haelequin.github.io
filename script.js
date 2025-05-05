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
    context.configure({ device, format, 
        alphaMode:"premultiplied", 
    });

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

    //-----------Time uniform-------------------//
    let time = 0;

    const timeBuf = device.createBuffer({
        size: 4 * 1,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' },
            },
        ], 
    });

    const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
    });  

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            { binding: 0, resource: { buffer: timeBuf }},
        ]
    });

    const pipeline = device.createRenderPipeline({
        label: 'our hardcoded red triangle pipeline',
        layout: pipelineLayout, 
        vertex: {
            module,
        },
        fragment: {
            module,
            targets: [{ format: format }],
        },
    });

    function render() {
        device.queue.writeBuffer(timeBuf, 0, new Float32Array([time]));    

        time += 0.02;

        renderPassDescriptor.colorAttachments[0].view =
        context.getCurrentTexture().createView();

        // make a command encoder to start encoding commands
        const encoder = device.createCommandEncoder({ label: 'our encoder' });
    
        // make a render pass encoder to encode render specific commands
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(6);
        pass.end();
    
        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        requestAnimationFrame(render);
    }

    render();
}

initCanvas();