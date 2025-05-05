struct VertexOutput {
    @builtin(position) position: vec4f, 
    @location(0) colorPos: vec2f, 
};

fn reMap(agl, ) -> f32 {

}

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

    return vec4f(color * ((cos(input.colorPos.x * 10) + 1) / 4 + 0.5), 1);
}