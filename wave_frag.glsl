#version 300 es
precision mediump float;

in vec2 v_pos;
in vec3 v_gradient;

out vec4 fragColor;

uniform uint u_time;
uniform uint u_cirCount;
uniform vec2 u_ratio;
uniform float u_scroll;
uniform float u_pixR;
uniform uint u_globleCirCount;
uniform uint u_aboutCirCount;

// Define maximum number of circles per group
#define MAX_CIRCLES 256

// Uniform arrays for circle data
uniform vec3 u_homecir[MAX_CIRCLES];
uniform vec3 u_globleCir[MAX_CIRCLES];
uniform vec3 u_aboutCir[MAX_CIRCLES];

const float PI = 3.141592653589793;
const float heightY = 600.0;

void main() {
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    float sum = 0.0;
    float t = float(min(u_time, uint(1000))) / 1000.0;
    float ani = 1.0 - pow(abs(1.0 - t), 4.0);
    float scrollpxR = u_scroll * u_pixR;
    float pixR2 = u_pixR / 2.0;

    for (uint i = 0u; i < u_globleCirCount; i++) {
        float cx = u_globleCir[i].x * u_pixR;
        float cy = (u_globleCir[i].y + u_scroll) * u_pixR;
        float r = u_globleCir[i].z * pixR2;
        sum += (r * r) / (pow(v_pos.x - cx, 2.0) + pow(v_pos.y - cy, 2.0));
    }

    sum += pow(0.5 * 50.0 * u_pixR, 2.0) / pow(v_pos.y - 25.0 * u_pixR, 2.0);

    if (v_pos.y > u_ratio.y * 3.0 + scrollpxR) {
        fragColor = color;
        return;
    } else if (v_pos.y > u_ratio.y + scrollpxR) {
        for (uint i = 0u; i < u_aboutCirCount; i++) {
            float cx = u_aboutCir[i].x * u_pixR;
            float cy = (u_aboutCir[i].y + u_scroll) * u_pixR;
            float r = u_aboutCir[i].z * pixR2;
            sum += (r * r) / (pow(v_pos.x - cx, 2.0) + pow(v_pos.y - cy, 2.0));
        }
        if (sum < 1.0) {
            fragColor = color;
            return;
        }
    } else {
        for (uint i = 0u; i < u_cirCount; i++) {
            float cx = u_homecir[i].x * u_pixR;
            float cy = (u_homecir[i].y + u_scroll) * u_pixR;
            float r = u_homecir[i].z * pixR2;
            sum += (r * r) / (pow(v_pos.x - cx, 2.0) + pow(v_pos.y - cy, 2.0));
        }
        if (sum >= 1.0) {
            fragColor = color;
            return;
        }
    }

    if (v_pos.y < u_ratio.y + scrollpxR) {
        sum = 0.0;
        for (uint i = 0u; i < u_cirCount; i++) {
            float cx = u_homecir[i].x * u_pixR + 100.0 * ani;
            float cy = (u_homecir[i].y + u_scroll) * u_pixR + 50.0 * ani;
            float r = u_homecir[i].z * pixR2;
            sum += (r * r) / (pow(v_pos.x - cx, 2.0) + pow(v_pos.y - cy, 2.0));
        }

        for (uint i = 0u; i < u_globleCirCount; i++) {
            float cx = u_globleCir[i].x * u_pixR + 50.0 * ani;
            float cy = (u_globleCir[i].y + u_scroll) * u_pixR;
            float r = u_globleCir[i].z * pixR2;
            sum += (r * r) / (pow(v_pos.x - cx, 2.0) + pow(v_pos.y - cy, 2.0));
        }

        sum += pow(0.5 * 50.0 * u_pixR, 2.0) / pow(v_pos.y - 25.0 * u_pixR, 2.0);

        if (sum >= 1.0) {
            fragColor = vec4(0.7, 0.7, 0.7, 1.0);
            return;
        }
    }

    float fade = (v_pos.y + 200.0 > u_ratio.y * 3.0 + scrollpxR)
        ? 1.0
        : 1.0 - (v_pos.y + 200.0 - (u_ratio.y * 3.0 + scrollpxR)) / 200.0;

    fragColor = vec4(1.0, 1.0, 1.0, 1.0) * fade;
}