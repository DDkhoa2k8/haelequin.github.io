struct VertexOutput {
    @builtin(position) position: vec4f, 
    @location(0) colorPos: vec2f, 
};

fn reMap(agl: f32, pos: vec2f) -> f32 {
    return pos.x * cos(agl) + pos.y * sin(agl);
}

const PI: f32 = 3.141592653589793;

@group(0) @binding(0) var<uniform> time: f32;

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

    let colorPos = array(
        vec2f(1, 1), 
        vec2f(-1, 1),
        vec2f(1, -1), 

        vec2f(-1, -1), 
        vec2f(-1, 1), 
        vec2f(1, -1), 
    );

    output.position = vec4f(vertex[vertexIndex], 0, 1);
    output.colorPos = colorPos[vertexIndex];
    
    return output;
}

@fragment
fn fs(input: VertexOutput) -> @location(0) vec4f {
    let color = vec3f(0.0, 135.0, 255.0) / 255.0;

    let h = (cos(reMap(0.5235987755982988, input.colorPos) * 7 + 
            sin(reMap(0.5235987755982988 + PI / 2, input.colorPos) * 5) + time
        ) + 1) / 4 + 0.2;

    return vec4f(
        color * h, 1
    );
}