struct VertexOutput {
    @builtin(position) position: vec4f, 
    @location(0) colorPos: vec2f, 
};

fn reMap(agl: f32, pos: vec2f) -> f32 {
    return pos.x * cos(agl) + pos.y * sin(agl);
}

fn dis(A:vec2f, B:vec2f) -> f32 {
    return length(A - B);
}

const PI: f32 = 3.141592653589793;
const heightY = 600;

@group(0) @binding(0) var<uniform> time: f32;
@group(0) @binding(1) var<uniform> cirCount: u32;
@group(0) @binding(2) var<storage, read> cir: array<vec2f>;


@vertex
fn vs(@builtin(vertex_index) vertexIndex : u32) -> VertexOutput {
    var output: VertexOutput;

    let vertex = array(
        vec2f(1, 1), 
        vec2f(-1, 1),
        vec2f(1, -1), 

        vec2f(-1, -1), 
        vec2f(-1, 1), 
        vec2f(1, -1), 
    );

    output.position = vec4f(vertex[vertexIndex], 0, 1);
    output.colorPos = vec2f(vertex[vertexIndex]);
    
    return output;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4f {
    for (var i:u32 = 0;i < cirCount;i++) {
        if (dis(input.colorPos, cir[i]) < .5) {
            return vec4f(1, 0, 0, 1);
        }
    }

    return vec4f(0, 0, 0, 0);
}