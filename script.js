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

function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

async function initCanvas() {
    if (!navigator.gpu || true) {//WebGl fallback
        let canvas = document.querySelector('#cv');
        canvas.height = window.innerHeight * window.devicePixelRatio;
        canvas.width = window.innerWidth * window.devicePixelRatio;

        const gl = canvas.getContext('webgl2');
        if (!gl) {
            alert('Your browser does not support WebGL2');
            return;
        }

        // Load shaders
        const verSha = createShader(gl, gl.VERTEX_SHADER, await loadShader("wave_ver.glsl"));
        const fragSha = createShader(gl, gl.FRAGMENT_SHADER, await loadShader("wave_frag.glsl"));
        var program = createProgram(gl, verSha, fragSha);

        // Create vertex array
        const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        var positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        
        // Fullscreen quad vertices
        var positions = [
            -1, -1,
            1, -1,
            -1, 1,
            -1, 1,
            1, -1,
            1, 1
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        var vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        gl.enableVertexAttribArray(positionAttributeLocation);
        
        var size = 2;
        var type = gl.FLOAT;
        var normalize = false;
        var stride = 0;
        var offset = 0;
        gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

        // Create uniform buffers
        const timeBuf = gl.createBuffer();
        const scrollBuf = gl.createBuffer();
        const ratioBuf = gl.createBuffer();
        const pixRaBuf = gl.createBuffer();
        const countBuf = gl.createBuffer();
        const globleCountBuf = gl.createBuffer();
        const aboutCountBuf = gl.createBuffer();
        
        // Create storage buffers for circles
        const homeCirBuf = gl.createBuffer();
        const globleCirBuf = gl.createBuffer();
        const aboutCirBuf = gl.createBuffer();

        // Get uniform locations
        const uniformLocations = {
            u_time: gl.getUniformLocation(program, 'u_time'),
            u_cirCount: gl.getUniformLocation(program, 'u_cirCount'),
            u_ratio: gl.getUniformLocation(program, 'u_ratio'),
            u_scroll: gl.getUniformLocation(program, 'u_scroll'),
            u_pixR: gl.getUniformLocation(program, 'u_pixR'),
            u_globleCirCount: gl.getUniformLocation(program, 'u_globleCirCount'),
            u_aboutCirCount: gl.getUniformLocation(program, 'u_aboutCirCount'),
            u_homecir: gl.getUniformLocation(program, 'u_homecir'),
            u_globleCir: gl.getUniformLocation(program, 'u_globleCir'),
            u_aboutCir: gl.getUniformLocation(program, 'u_aboutCir'),
        };

        // Global circles
        let cirCursor = [500, 500, 0];
        let cirNav = [];
        const cirNavCount = 10;
        const cirNavSize = 50;
        for (let i = 0; i < cirNavCount; i++) {
            cirNav.push(i * (window.innerWidth / cirNavCount), 0, cirNavSize);
        }
        
        let cirArrow = [];
        cirArrow.push(window.innerWidth / 2 + Math.random() * 40 - 20, window.innerWidth * .8 + Math.random() * 40 - 20, 70);
        cirArrow.push(window.innerWidth / 2 + Math.random() * 40 - 20, window.innerHeight * .8 + Math.random() * 40 - 20, 50);

        let globleCir = new Float32Array([...cirCursor, ...cirArrow, ...cirNav]);
        
        // Home circles
        let cirWord = [];
        const cirPerword = 4;
        const cirWordSize = 70;
        let word = document.querySelectorAll('#home-header>span, #sub-header');
        word.forEach(e => {
            for (let i = 0; i < cirPerword; i++) {
                const bound = e.getBoundingClientRect();
                let startCor = 1 * (bound.top + bound.height / 2);
                cirWord.push((bound.left + i * (bound.width / cirPerword)) * 1, startCor, cirWordSize);
            }
        });
        let homeCircle = new Float32Array(cirWord);
        
        // About circles
        let aboutTextBoxTar = [];
        let aboutTextBox = [];
        let aboutTextBoxOld = [];
        let aboutTxtEl = document.querySelector('#aboutTxt').getBoundingClientRect();
        let aboutTextBoxSize = 100;
        const aboutTextBoxCount = 30;
        
        loop:
        for (let h = 0; h < Math.floor(aboutTxtEl.height / aboutTextBoxSize) + 1; h++) {
            for (let w = 0; w < Math.floor(aboutTxtEl.width / aboutTextBoxSize) + 1; w++) {
                if ((w + 1) * (h + 1) > aboutTextBoxCount) {   
                    break loop;
                }
                aboutTextBoxTar.push((aboutTxtEl.left + aboutTextBoxSize * w) * 1, (aboutTxtEl.top + aboutTextBoxSize * h) * 1, aboutTextBoxSize);
                aboutTextBoxOld.push(window.innerWidth / 2, window.innerHeight * 1.5, 0);
            }
        }
        let aboutCircle = new Float32Array(aboutTextBoxCount * 3);
        
        let home = document.getElementById('mainL');
        let con = document.getElementById('con');
        let scroll = 0;
        let startTime = Date.now();
        let aboutTextBoxAni;
        let oldTime = 0;
        let startABoutAni;

        const reSize = new ResizeObserver(en => {
            en.forEach(e => {
                e.target.height = e.target.getBoundingClientRect().height * window.devicePixelRatio;
                e.target.width = e.target.getBoundingClientRect().width * window.devicePixelRatio;

                cirWord = [];
                word.forEach(e => {
                    for (let i = 0; i < cirPerword; i++) {
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
                scroll = -con.scrollTop;

                loop:
                for (let h = 0; h < Math.round(aboutTxtEl.height / aboutTextBoxSize) + 3; h++) {
                    for (let w = 0; w < Math.round(aboutTxtEl.width / aboutTextBoxSize) + 1; w++) {
                        if ((w + 1) * (h + 3) > aboutTextBoxCount) {   
                            break loop;
                        }
                        aboutTextBoxTar.push((aboutTxtEl.left + aboutTextBoxSize * w) * 1, (aboutTxtEl.top + aboutTextBoxSize * h) * 1 - scroll, aboutTextBoxSize);
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

        function render() {
            const time = Date.now() - startTime;
            oldTime = time;
            
            // Update uniforms
            gl.useProgram(program);
            
            // Time
            gl.bindBuffer(gl.UNIFORM_BUFFER, timeBuf);
            gl.bufferData(gl.UNIFORM_BUFFER, new Uint32Array([time]), gl.DYNAMIC_DRAW);
            gl.uniform1ui(uniformLocations.u_time, time);
            
            // Ratio
            gl.bindBuffer(gl.UNIFORM_BUFFER, ratioBuf);
            gl.bufferData(gl.UNIFORM_BUFFER, new Float32Array([
                canvas.width * 1800 / (window.innerHeight * devicePixelRatio), 
                1800
            ]), gl.DYNAMIC_DRAW);
            gl.uniform2fv(uniformLocations.u_ratio, new Float32Array([
                canvas.width * 1800 / (window.innerHeight * devicePixelRatio), 
                1800
            ]));
            
            // Pixel ratio
            gl.bindBuffer(gl.UNIFORM_BUFFER, pixRaBuf);
            gl.bufferData(gl.UNIFORM_BUFFER, new Float32Array([
                devicePixelRatio * 1800 / (window.innerHeight * devicePixelRatio)
            ]), gl.DYNAMIC_DRAW);
            gl.uniform1f(uniformLocations.u_pixR, 
                devicePixelRatio * 1800 / (window.innerHeight * devicePixelRatio)
            );
            
            // Scroll
            scroll = -con.scrollTop;
            gl.bindBuffer(gl.UNIFORM_BUFFER, scrollBuf);
            gl.bufferData(gl.UNIFORM_BUFFER, new Float32Array([scroll]), gl.DYNAMIC_DRAW);
            gl.uniform1f(uniformLocations.u_scroll, scroll);
            
            let tempCirNav = [...cirNav];
            for (let i = 0; i < cirNav.length / 3; i++) {
                tempCirNav[3 * i + 1] = cirNav[3 * i + 1] + Math.abs(Math.sin(time / 2000 + cirNav[3 * i])) * 25 - scroll;
            }

            let tempCirArrow = [...cirArrow];
            tempCirArrow[1] -= scroll;
            tempCirArrow[4] -= scroll;

            let arrowPos = aboutRect.top - scroll / 1 + aboutRect.height / 2;
            
            if (scroll < -window.innerHeight * 2.5) {
                animateSkill();
            } else if (scroll < -window.innerHeight * 1.8) {
                const s = document.querySelector('#skillHead h1');
                s.style.opacity = "1";
                s.style.letterSpacing = "normal";
            }

            if (arrowPos > window.innerHeight * 1.5) {
                tempCirArrow[1] = window.innerHeight * 1.5;
                tempCirArrow[4] = window.innerHeight * 1.5;

                if (aboutTextBoxAni === undefined) {
                    startABoutAni = time;
                    showAbout();
                    aboutTextBoxAni = arrAni([...aboutTextBoxOld], [...aboutTextBoxTar], 1000, time, 'ease');
                }
            } else if (arrowPos > window.innerHeight) {
                about.classList.add('showAbout');
            } else {
                about.classList.remove('showAbout');
            }

            if (aboutTextBoxAni !== undefined) aboutTextBox = aboutTextBoxAni(time);

            for (let i = 0; i < cirArrow.length / 3; i++) {
                let dir = (i % 2 == 0 ? 1 : -1);
                tempCirArrow[3 * i + 1] += Math.sin(time / 2000 + i * 2) * 25 * dir;
                tempCirArrow[3 * i] += Math.sin(time / 2000 + i * 10) * 25 * dir;
            }

            globleCir = new Float32Array([...cirCursor, ...tempCirArrow, ...tempCirNav]);
            globleCir[1] -= scroll;

            // Update global circles
            gl.bindBufferBase(gl.UNIFORM_BUFFER, 6, globleCirBuf);
            gl.bufferData(gl.UNIFORM_BUFFER, globleCir, gl.DYNAMIC_DRAW);
            gl.uniform3fv(uniformLocations.u_globleCir, globleCir);
            gl.uniform1ui(uniformLocations.u_globleCirCount, globleCir.length / 3);

            // Update home circles
            let tempCirWord = [...cirWord];
            for (let i = 0; i < cirWord.length / 3; i++) {
                tempCirWord[3 * i + 1] = cirWord[3 * i + 1] + Math.sin(time / 2000 + cirWord[3 * i]) * 25;
                tempCirWord[3 * i] = cirWord[3 * i] + Math.sin(time / 2000 + cirWord[3 * i]) * 25;
            }
            homeCircle = new Float32Array(tempCirWord);
            
            gl.bindBufferBase(gl.UNIFORM_BUFFER, 2, homeCirBuf);
            gl.bufferData(gl.UNIFORM_BUFFER, homeCircle, gl.DYNAMIC_DRAW);
            gl.uniform3fv(uniformLocations.u_homecir, homeCircle);
            gl.uniform1ui(uniformLocations.u_cirCount, homeCircle.length / 3);

            // Update about circles
            let tempAboutTextBox = [...aboutTextBox];
            for (let i = 0; i < aboutTextBox.length / 3; i++) {
                tempAboutTextBox[3 * i + 1] = aboutTextBox[3 * i + 1] + Math.abs(Math.sin(time / 2000 + i * 10)) * 50;
                tempAboutTextBox[3 * i] = aboutTextBox[3 * i] + Math.abs(Math.cos(time / 2000 + i * 5)) * 50;
            }
            aboutCircle = new Float32Array(tempAboutTextBox);
            
            gl.bindBufferBase(gl.UNIFORM_BUFFER, 8, aboutCirBuf);
            gl.bufferData(gl.UNIFORM_BUFFER, aboutCircle, gl.DYNAMIC_DRAW);
            gl.uniform3fv(uniformLocations.u_aboutCir, aboutCircle);
            gl.uniform1ui(uniformLocations.u_aboutCirCount, aboutCircle.length / 3);

            // Render
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            requestAnimationFrame(render);
        }

        document.addEventListener('pointermove', throttle(e => {
            cirCursor[0] = e.clientX * 1;
            cirCursor[1] = e.clientY * 1;
            cirCursor[2] = 100;
        }, 8));

        render();
    } else {
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

                // document.querySelectorAll('.runText span').forEach((e, i) => {
                //     if (i == 0)
                //     e.parentElement.style.transform = "translate(-" + (e.getBoundingClientRect().width + .1  * window.innerWidth) + "px, " + -.1 * window.innerHeight + "px)";
                //     else 
                //     e.parentElement.style.transform = "translate(" + (e.getBoundingClientRect().width + .1  * window.innerWidth) + "px, " + .1 * window.innerHeight + "px)";
                // });

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
                    // aboutTextBoxAni = arrAni([...aboutTextBoxOld], [...aboutTextBoxTar], window.innerHeight / 2, 0, 'ease');
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
            //runPhysics(oldTime, time, 10);
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

            if (scroll < -window.innerHeight * 2.5) {
                animateSkill();
            } else if (scroll < -window.innerHeight * 1.8) {
                const s = document.querySelector('#skillHead h1');
                s.style.opacity = "1";
                s.style.letterSpacing = "normal";
            }

            if (arrowPos > window.innerHeight * 1.5) {
                tempCirArrow[1] = window.innerHeight * 1.5;
                tempCirArrow[4] = window.innerHeight * 1.5;


                if (aboutTextBoxAni === undefined) startABoutAni = time, showAbout(), aboutTextBoxAni = arrAni([...aboutTextBoxOld], [...aboutTextBoxTar], 1000, time, 'ease');
                //if (aboutTextBoxAni === undefined) showAbout(), aboutTextBoxAni = arrAni([...aboutTextBoxOld], [...aboutTextBoxTar], window.innerHeight / 2, 0, 'ease');
            } else if (arrowPos > window.innerHeight) {
                about.classList.add('showAbout');
            } else {
                about.classList.remove('showAbout');
            }

            // if (aboutTextBoxAni !== undefined) aboutTextBox = aboutTextBoxAni(arrowPos - window.innerHeight * 1.5);
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

        document.addEventListener('pointermove', throttle(e => {
            cirCursor[0] = e.clientX * 1;
            cirCursor[1] = e.clientY * 1;
            cirCursor[2] = 100;

            // document.getElementById('cur').style.top = e.clientY + "px";
            // document.getElementById('cur').style.left = e.clientX + "px";
        }, 8));

        render();
    }
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

function getRotationAngle(element) {
    const style = window.getComputedStyle(element);
    const transform = style.transform || style.webkitTransform || style.mozTransform;

    if (!transform || transform === 'none') {
        return 0;
    }

    // Transform matrix: matrix(a, b, c, d, tx, ty)
    const values = transform.match(/matrix\(([^)]+)\)/)[1].split(', ');
    const a = parseFloat(values[0]);
    const b = parseFloat(values[1]);

    const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
    return (angle + 360) % 360;
}

function scrollHome() {
    let e =  document.getElementById('mainL');

    e.scrollIntoView({
        behavior: 'smooth', 
    });
}

function scrollAbout() {
    let e =  document.getElementById('about');

    e.scrollIntoView({
        behavior: 'smooth', 
    });
}

function scrollSkill() {
    let e =  document.getElementById('skillHead');

    e.scrollIntoView({
        behavior: 'smooth', 
    });
}

function animateSkill() {
    let s = document.getElementById("skill");

    if (!s.classList.value.includes('traigger'))
    s.classList.add('trigger');
}

function cardClick(i) {
    const card = document.querySelectorAll(`#skill .card`)[i];
    if (!card.show) {
        const rect = card.getBoundingClientRect();

        const x = window.innerWidth / 2 - rect.left - rect.width / 2;

        card.show = true;
        card.style.transform = `translate(${x}px, 0px) rotateY(-180deg) rotateZ(-90deg)`;
        card.style.zIndex = 100;
        card.style.height = "90vw";
    } else {
        const card = document.querySelectorAll(`#skill .card`)[i];
        card.style.transform = "";
        card.style.height = "80%";
        card.style.zIndex = '1';
        card.show = false;
    }
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