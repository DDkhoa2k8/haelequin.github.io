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

function dis(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function arrAni(old, tar, dur, curTime, algo = 'ease') {
    let dif = [];

    tar.forEach((e, i) => {
        dif.push(old[i] - e);
    });

    return (time) => {
        if (time > curTime + dur) {
            return tar;
        } else if (time < curTime) {
            return old;
        }

        const aniTime = (time - curTime) / dur;
        let r = [];
        
        if (algo === 'ease') {
            old.forEach((e, i) => {
                r.push(e - dif[i] * (1 - (1 - aniTime) ** 4));
            });
        }
        return r;
    }
}

function throttle(fn, delay) {
    let lastTime = 0;
    return function (...args) {
        let now = Date.now();
        if (now - lastTime >= delay) {
            fn.apply(this, args);
            lastTime = now;
        }
    };
}

const K = [//cor:x down to up, 0 to 1, y left to right, 0 to 1
    .2, //stroke width
    1, //height
    .5, //width  
    {
        lineFrom: {x: .1, y:.1},
        lineTo: {x: .1, y:.9},
    }, 
    {
        lineFrom: {x: .1, y:.5},
        lineTo: {x: .4, y:.9},
    }, 
    {
        lineFrom: {x: .1, y:.5},
        lineTo: {x: .4, y:.1},
    }, 
];

const Y_nga = [
    .2, 
    1.2, 
    .5, 
    {
        lineFrom: {x: .1, y:.1}, 
        lineTo: {x: .4, y:.9}, 
    }, 
    {
        lineFrom: {x: .1, y:.9}, 
        lineTo: {x: .25, y:.5}, 
    }, 
];

async function initCanvas() {
    let canvas = document.querySelector('#cv');
    // const

    canvas.height = window.innerHeight * window.devicePixelRatio;
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
    let startTime = Date.now();

    const timeBuf = device.createBuffer({
        size: 4 * 1,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const scrollBuf = device.createBuffer({
        size: 4 * 1,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    //Global
    let cirCursor = [
        500, 500, 0, 
    ];

    let cirNav = [];
    const cirNavCount = 10;
    const cirNavSize = 50;

    for (let i = 0;i < cirNavCount;i++) {
        cirNav.push(i * (window.innerWidth / cirNavCount), 0, cirNavSize);
    }
    
    let cirArrow = [];
    
    cirArrow.push(window.innerWidth / 2 + Math.random() * 40 - 20, window.innerWidth * .8 + Math.random() * 40 - 20, 70);
    cirArrow.push(window.innerWidth / 2 + Math.random() * 40 - 20, window.innerHeight * .8 + Math.random() * 40 - 20, 50);

    let globleCir = new Float32Array(cirNav.length + 3 + cirArrow.length);

    const globleCirBuf = device.createBuffer({
        size: globleCir.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const globleCountBuf = device.createBuffer({
        size: 4 * 1,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 
    });
    //HOME
    let cirWord = [];
    const cirPerword = 4;
    const cirWordSize = 70;

    let word = document.querySelectorAll('#home-header>span, #sub-header');

    word.forEach(e => {
        for (let i = 0;i < cirPerword;i++) {
            const bound = e.getBoundingClientRect();

            let startCor = 1 * (bound.top + bound.height / 2);

            cirWord.push((bound.left + i * (bound.width / cirPerword)) * 1, startCor, cirWordSize);
        }
    });

    let homeCircle = new Float32Array(cirWord.length);

    const homeCirBuf = device.createBuffer({
        size: homeCircle.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    
    const countBuf = device.createBuffer({
        size: 4 * 1,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, 
    });
    //ABOUT
    let aboutTextBoxTar = [];
    let aboutTextBox = [];
    let aboutTextBoxOld = [];
    let aboutTxtEl = document.querySelector('#aboutTxt').getBoundingClientRect();
    let aboutTextBoxSize = 100;

    const aboutTextBoxCount = 30;

    loop:
    for (let h = 0;h < Math.floor(aboutTxtEl.height / aboutTextBoxSize) + 1;h++) {
        for (let w = 0;w < Math.floor(aboutTxtEl.width / aboutTextBoxSize) + 1;w++) {
            if ((w + 1) * (h + 1) > aboutTextBoxCount) {   
                break loop;
            }

            aboutTextBoxTar.push((aboutTxtEl.left + aboutTextBoxSize * w) * 1, (aboutTxtEl.top + aboutTextBoxSize * h) * 1, aboutTextBoxSize);
            aboutTextBoxOld.push(window.innerWidth / 2, window.innerHeight * 1.5, 0);
        }
    }
    let aboutCircle = new Float32Array(aboutTextBoxCount * 3);

    const aboutCirBuf = device.createBuffer({
        size: aboutCircle.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const aboutCountBuf = device.createBuffer({
        size: 4 * 1,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const ratioBuf = device.createBuffer({
        size: 4 * 2,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const pixRaBuf = device.createBuffer({
        size: 4 * 1,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

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
            {
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: "uniform" }, 
            },
            {
                binding: 4,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: "uniform" }, 
            },
            {
                binding: 5,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: "uniform" }, 
            },
            {
                binding: 6,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }, 
            },
            {
                binding: 7,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: "uniform" }, 
            },
            {
                binding: 8,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: "read-only-storage" }, 
            },
            {
                binding: 9,
                visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
                buffer: { type: "uniform" }, 
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
            { binding: 2, resource: { buffer: homeCirBuf }}, 
            { binding: 3, resource: { buffer: ratioBuf }}, 
            { binding: 4, resource: { buffer: scrollBuf }}, 
            { binding: 5, resource: { buffer: pixRaBuf }}, 
            { binding: 6, resource: { buffer: globleCirBuf }}, 
            { binding: 7, resource: { buffer: globleCountBuf }}, 
            { binding: 8, resource: { buffer: aboutCirBuf }}, 
            { binding: 9, resource: { buffer: aboutCountBuf }}, 
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

    let home = document.getElementById('mainL');
    let con = document.getElementById('con');
    let scroll;

    const reSize = new ResizeObserver(en => {
        en.forEach(e => {
            e.target.height = e.target.getBoundingClientRect().height * window.devicePixelRatio;
            e.target.width = e.target.getBoundingClientRect().width * window.devicePixelRatio;

            cirWord = [];
        
            word.forEach(e => {
                for (let i = 0;i < cirPerword;i++) {
                    const bound = e.getBoundingClientRect();
        
                    let startCor = 1 * (bound.top + bound.height / 2);
        
                    cirWord.push((bound.left + i * (bound.width / cirPerword)) * 1, startCor - scroll, cirWordSize);
                }
            });

            cirArrow = [];
    
            cirArrow.push(window.innerWidth / 2 + Math.random(), window.innerHeight * .8 + Math.random(), 100);
            cirArrow.push(window.innerWidth / 2 + Math.random(), window.innerHeight * .8 + Math.random(), 100);


            aboutTextBoxTar = [];
            aboutTextBoxOld = [];
            aboutTxtEl = document.querySelector('#aboutTxt').getBoundingClientRect();
  
            // scroll = (home.getBoundingClientRect().top - 50) * 1;
            scroll = -con.scrollTop;

            loop:
            for (let h = 0;h < Math.round(aboutTxtEl.height / aboutTextBoxSize) + 3;h++) {
                for (let w = 0;w < Math.round(aboutTxtEl.width / aboutTextBoxSize) + 1;w++) {
                    if ((w + 1) * (h + 3) > aboutTextBoxCount) {   
                        break loop;
                    }

                    aboutTextBoxTar.push((aboutTxtEl.left + aboutTextBoxSize * (w)) * 1, (aboutTxtEl.top + aboutTextBoxSize * (h - 1/2)) * 1 - scroll, aboutTextBoxSize);
                    aboutTextBoxOld.push(window.innerWidth / 2, window.innerHeight * 1.5, 0);
                }
            }

            if (aboutTextBoxAni !== undefined) {
                aboutTextBoxAni = arrAni([...aboutTextBoxOld], [...aboutTextBoxTar], 1000, startABoutAni, 'ease');
            }
        });
    });

    reSize.observe(canvas);

    let about = document.getElementById('fix');
    let aboutRect = about.getBoundingClientRect();
    let aboutTextBoxAni;
    let oldTime = 0;
    let startABoutAni;

    function render() {
        time = Date.now() - startTime;
        runPhysics(oldTime, time, 10);
        oldTime = time;

        let arrowPos = aboutRect.top - scroll / 1 + aboutRect.height / 2;
        
        device.queue.writeBuffer(timeBuf, 0, new Uint32Array([time]));

        device.queue.writeBuffer(ratioBuf, 0, new Float32Array([canvas.width * 1800 / (window.innerHeight * devicePixelRatio), 1800]));

        device.queue.writeBuffer(pixRaBuf, 0, new Float32Array([devicePixelRatio * 1800 / (window.innerHeight * devicePixelRatio)]));

        // scroll = (home.getBoundingClientRect().top) * 1;
        scroll = -con.scrollTop;

        device.queue.writeBuffer(scrollBuf, 0, new Float32Array([scroll]));

        let tempCirNav = [...cirNav];

        for (let i = 0;i < cirNav.length / 3;i++) {
            tempCirNav[3 * i + 1] = cirNav[3 * (i) + 1] + Math.abs(Math.sin(time / 2000 + cirNav[3 * (i)])) * 25 - scroll;
        }

        let tempCirArrow = [...cirArrow];

        tempCirArrow[1] -= scroll;
        tempCirArrow[4] -= scroll;

        if (scroll < -(window.innerHeight * 1.75 - 50)) {
            document.querySelector('#skill h1').style.opacity = "1";
        }

        if (arrowPos > window.innerHeight * 1.5) {
            tempCirArrow[1] = window.innerHeight * 1.5 * 1;
            tempCirArrow[4] = window.innerHeight * 1.5 * 1;

            if (aboutTextBoxAni === undefined) startABoutAni = time, showAbout(), aboutTextBoxAni = arrAni([...aboutTextBoxOld], [...aboutTextBoxTar], 1000, time, 'ease');
        } else if (arrowPos > window.innerHeight) {
            about.classList.add('showAbout');
        } else {
            about.classList.remove('showAbout');
        }

        if (aboutTextBoxAni !== undefined) aboutTextBox = aboutTextBoxAni(time);

        for (let i = 0;i < cirArrow.length / 3;i++) {
            let dir = (i % 2 == 0 ? 1:-1);
            tempCirArrow[3 * i + 1] += Math.sin(time / 2000 + i * 2) * 25 * dir;
            tempCirArrow[3 * i] += Math.sin(time / 2000 + i * 10) * 25 * dir;
        }

        globleCir = new Float32Array([
            ...cirCursor, 
            ...tempCirArrow, 
            ...tempCirNav, 
        ]);

        globleCir[1] -= scroll;

        device.queue.writeBuffer(globleCirBuf, 0, globleCir);
        globleCir[1] += scroll;

        device.queue.writeBuffer(globleCountBuf, 0, new Uint32Array([globleCir.length / 3]));
        let tempCirWord = [...cirWord];

        for (let i = 0;i < cirWord.length / 3;i++) {
            tempCirWord[3 * i + 1] = cirWord[3 * (i) + 1] + Math.sin(time / 2000 + cirWord[3 * (i)]) * 25;
            tempCirWord[3 * i] = cirWord[3 * (i)] + Math.sin(time / 2000 + cirWord[3 * (i)]) * 25;
        }

        homeCircle = new Float32Array([
            ...tempCirWord, 
        ]);

        device.queue.writeBuffer(homeCirBuf, 0, homeCircle);
        
        device.queue.writeBuffer(countBuf, 0, new Uint32Array([homeCircle.length / 3]));

        //ABOUT

        let tempAboutTextBox = [...aboutTextBox];

        for (let i = 0;i < aboutTextBox.length / 3;i++) {
            tempAboutTextBox[3 * i + 1] = aboutTextBox[3 * (i) + 1] + Math.abs(Math.sin(time / 2000 + i * 10)) * 50;
            tempAboutTextBox[3 * i] = aboutTextBox[3 * (i)] + Math.abs(Math.cos(time / 2000 + i * 5)) * 50;
        }

        aboutCircle = new Float32Array([
            ...tempAboutTextBox, 
        ]);

        device.queue.writeBuffer(aboutCirBuf, 0, aboutCircle);
        
        device.queue.writeBuffer(aboutCountBuf, 0, new Uint32Array([aboutCircle.length / 3]));

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

    document.addEventListener('mousemove', throttle(e => {
        cirCursor[0] = e.clientX * 1;
        cirCursor[1] = e.clientY * 1;
        cirCursor[2] = 100;

        document.getElementById('cur').style.top = e.clientX + "px";
        document.getElementById('cur').style.left = e.clientY + "px";
    }, 8));

    render();
}

function setDelayAni(gap, ani, query) {
    const els = document.querySelectorAll(query);

    els.forEach((e, i) => {
        e.style.animation = ani;
        e.style.animationDelay = i * (gap / 1000) + "s";
        e.style.animationFillMode = "forwards";
    });
}

function showAbout() {
    const about = document.querySelectorAll('#aboutTxt span span');

    document.querySelector('#about h1').classList.add('showAbout');
    // document.querySelector('#about h1').offsetHeight;

    let layer = 0;
    let layerIndex = -1;

    about.forEach(e => {
        let rect = e.getBoundingClientRect();

        if (rect.top > layer) {
            layer = rect.top;
            layerIndex++;
        }

        e.style.animation = "showUp 1s ease forwards";
        e.style.animationDelay = layerIndex * .1 + "s";
        e.style.animationFillMode = "forwards";
    });
}

function setPhysics() {
    let ani = document.getElementById('animation');

    for (let i = 0;i < 10;i++) {
        let sq = document.createElement('div');
        let shape = (Math.random() > .5 ? "square":"circle");
        sq.className = "obs " + shape;
        sq.type = (Math.random() > .5 ? "soft":"solid");
        sq.style.left = Math.random() * 100 + "%";
        sq.speedx = 10 * Math.random() + 5;
        if (shape != "circle") {
            sq.style.transform = "rotate(" + Math.random() * 90 + "deg)";
            sq.aglS = 10 * (Math.random() - .5);
        }

        ani.append(sq);
    }
}

function checkColision(e) {//debugger
    let rectLeft = document.getElementsByClassName('jump')[0].getBoundingClientRect();
    let cenLeft = {x:rectLeft.top + rectLeft.height / 2, y:rectLeft.left + rectLeft.width / 2};
    let rect = e.getBoundingClientRect();

    const agl = Math.atan2(rect.height - cenLeft.y, rect.left - cenLeft.x);
    const d = dis({x:rect.left + 25, y:rect.top + 25}, {x:cenLeft.x, y:cenLeft.y});

    let local = {x:Math.cos(agl - 0.5235987755982988) * d, y:Math.sin(agl - 0.5235987755982988) * d};

    if (local.y > 0) {
        console.log(true);
    }
}

function runPhysics(oldTime, time, obsPerSec) {
    let ani = document.getElementById('animation');
    let rectAni = ani.getBoundingClientRect();
    let obs = document.querySelectorAll('#animation .obs');

    // if (time - oldTime > Math.random() * 1000 / obsPerSec) {
    //     let sq = document.createElement('div');
    //     // let shape = (Math.random() > .5 ? "square":"circle");
    //     sq.className = "obs circle";
    //     sq.type = (Math.random() > .5 ? "soft":"solid");
    //     // sq.shape = shape;
    //     sq.style.left = Math.random() * 100 + "%";
    //     sq.speedx = 0;
    //     sq.speedy = 0;
    //     // if (shape != "circle") {
    //     //     sq.style.transform = "rotate(" + Math.random() * 90 + "deg)";
    //     //     sq.aglS = 10 * (Math.random() - .5);
    //     // }

    //     ani.append(sq);
    // }

    obs.forEach(e => {
        checkColision(e);

        let rect = e.getBoundingClientRect();

        if (rect.top > rectAni.height + rectAni.top) {
            //e.remove();
        }

        e.speedx += 900 * 9.8 * (time - oldTime) / 1000;

        e.style.top = Number(e.style.top.replaceAll("px", "")) + e.speedx * (time - oldTime) / 1000 + "px";
        e.style.left = Number(e.style.left.replaceAll("%", "")) + (100 * e.speedy * (time - oldTime) / (window.innerWidth * 1000)) + "%";
    });
}

async function main() {    
    await initCanvas();

    setDelayAni(100, "showUp .5s ease", '#home-header span[class="move"]');

    const about = document.getElementById('aboutTxt');

    const aboutText = about.innerHTML;

    about.innerHTML = "";

    aboutText.split(' ').forEach(e => {
        about.innerHTML += ` <span><span>${e}</span></span>`;
    });
}

main();