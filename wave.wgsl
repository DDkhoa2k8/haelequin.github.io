struct VertexOutput {
    @builtin(position) position: vec4f, 
    @location(0) pos: vec2f, 
    @location(1) gradient: vec3f, 
};

fn reMap(agl: f32, pos: vec2f) -> f32 {
    return pos.x * cos(agl) + pos.y * sin(agl);
}

fn dis(A:vec2f, B:vec2f) -> f32 {
    return length(A - B);
}

const PI: f32 = 3.141592653589793;
const heightY = 600;

@group(0) @binding(0) var<uniform> time: u32;
@group(0) @binding(1) var<uniform> cirCount: u32;
@group(0) @binding(2) var<storage, read> homecir: array<f32>;
@group(0) @binding(3) var<uniform> ratio: vec2f;
@group(0) @binding(4) var<uniform> scroll: f32;
@group(0) @binding(5) var<uniform> pixR: f32;
@group(0) @binding(6) var<storage, read> globleCir: array<f32>;
@group(0) @binding(7) var<uniform> globleCirCount: u32;
@group(0) @binding(8) var<storage, read> aboutCir: array<f32>;
@group(0) @binding(9) var<uniform> aboutCirCount: u32;

@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
    var output: VertexOutput;

    let vertex = array(
        vec2f(-1, 1), 
        vec2f(-1, -1),
        vec2f(1, 1), 

        vec2f(-1, -1),
        vec2f(1, 1), 
        vec2f(1, -1), 
    );

    let pos = array(
        vec2f(0, 0), 
        vec2f(0, ratio.y), 
        vec2f(ratio.x, 0), 

        vec2f(0, ratio.y), 
        vec2f(ratio.x, 0), 
        vec2f(ratio.x, ratio.y), 
    );

    let gra = array(
        vec3f(0, 1, 0), 
        vec3f(0, 1, 0), 
        vec3f(0, 0, 1), 

        vec3f(0, 1, 0), 
        vec3f(0, 0, 1), 
        vec3f(0, 0, 1), 
    );

    output.position = vec4f(vertex[vertexIndex], 0, 1);
    output.pos = vec2f(pos[vertexIndex]);
    output.gradient = vec3f(gra[vertexIndex]);
    
    return output;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4f {
    //let color = vec4f(input.gradient, 1);
    let color = vec4f(0, 0, 0, 1);
    var sum:f32 = 0;
    let t = f32(min(time, 1000)) / 1000.0;
    let ani = 1 - pow(abs(1 - t), 4);

    for (var i: u32 = 0;i < globleCirCount;i++) {
        sum += pow(globleCir[3 * i + 2], 2) / (pow(input.pos.x - globleCir[3 * i], 2) + pow(input.pos.y - globleCir[3 * i + 1] - scroll, 2));
    }

    if (input.pos.y > ratio.y + scroll + 100) {
        for (var i: u32 = 0;i < aboutCirCount;i++) {
            sum += pow(aboutCir[3 * i + 2], 2) / (pow(input.pos.x - aboutCir[3 * i], 2) + pow(input.pos.y - aboutCir[3 * i + 1] - scroll, 2));
        }

        sum += pow(100 / pixR, 2) / pow(input.pos.y - 100 / pixR, 2);

        if (sum < 1) {
            return color;
        }
    } else {
        for (var i: u32 = 0;i < cirCount;i++) {
            sum += pow(homecir[3 * i + 2], 2) / (pow(input.pos.x - homecir[3 * i], 2) + pow(input.pos.y - homecir[3 * i + 1] - scroll, 2));
        }

        sum += pow(100 / pixR, 2) / pow(input.pos.y - 100 / pixR, 2);

        if (sum >= 1) {
            return color;
        }
    }

    sum = 0;

    for (var i: u32 = 0;i < cirCount;i++) {
        sum += pow(homecir[3 * i + 2], 2) / (pow(input.pos.x - homecir[3 * i] - 100 * ani, 2) + pow(input.pos.y - homecir[3 * i + 1] - scroll - 50 * ani, 2));
    }

    if (input.pos.y < ratio.y + scroll + 100) {
        for (var i: u32 = 0;i < globleCirCount;i++) {
            sum += pow(globleCir[3 * i + 2], 2) / (pow(input.pos.x - globleCir[3 * i] - 50 * ani, 2) + pow(input.pos.y - globleCir[3 * i + 1] - scroll, 2));
        }

        sum += pow(100 / pixR, 2) / pow(input.pos.y - 100 / pixR, 2);
    }

    if (sum >= 1) {
        return vec4f(0.7, .7, .7, 1);
    }

    return vec4f(1);
}