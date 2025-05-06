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
        e.target.height = e.target.getBoundingClientRect().height * window.devicePixelRatio;
        e.target.width = window.innerWidth * window.devicePixelRatio;
    });
});

async function initCanvas() {
    let canvas = document.querySelector('#cv');

    reSize.observe(canvas);

    canvas.height = canvas.getBoundingClientRect().height * window.devicePixelRatio;
    canvas.width = window.innerWidth * window.devicePixelRatio;

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

    const countBuf = device.createBuffer({
        size: 4 * 1,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 
    });

    const circle = new Float32Array([
        0, 0, 1, 
    ]);

    const cirBuf = device.createBuffer({
        size: circle.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        mappedAtCreation: true,
    });
      
      new Float32Array(cirBuf.getMappedRange()).set(circle);
      cirBuf.unmap();

    const bindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' },
            },
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' },
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }, 
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
            { binding: 1, resource: { buffer: countBuf }}, 
            { binding: 2, resource: { buffer: cirBuf }}, 
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

        device.queue.writeBuffer(countBuf, 0, new Uint32Array([1]));

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

function setDelayAni(gap, ani, query) {
    const els = document.querySelectorAll(query);

    els.forEach((e, i) => {
        e.style.animation = ani;
        e.style.animationDelay = i * (gap / 1000) + "s";
        e.style.animationFillMode = "forwards";
    });
}

setDelayAni(100, "showUp .5s ease", '#home-header span[class="move"]');