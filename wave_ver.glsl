#version 300 es
precision mediump float;

out vec2 v_pos;
out vec3 v_gradient;

uniform vec2 u_ratio;

void main() {
    vec2 vertex[6] = vec2[](
        vec2(-1.0,  1.0),
        vec2(-1.0, -1.0),
        vec2( 1.0,  1.0),
        vec2(-1.0, -1.0),
        vec2( 1.0,  1.0),
        vec2( 1.0, -1.0)
    );

    vec2 pos[6] = vec2[](
        vec2(0.0, 0.0),
        vec2(0.0, u_ratio.y),
        vec2(u_ratio.x, 0.0),
        vec2(0.0, u_ratio.y),
        vec2(u_ratio.x, 0.0),
        vec2(u_ratio.x, u_ratio.y)
    );

    vec3 gra[6] = vec3[](
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 0.0, 1.0),
        vec3(0.0, 1.0, 0.0),
        vec3(0.0, 0.0, 1.0),
        vec3(0.0, 0.0, 1.0)
    );

    int idx = gl_VertexID;

    gl_Position = vec4(vertex[idx], 0.0, 1.0);
    v_pos = pos[idx];
    v_gradient = gra[idx];
}