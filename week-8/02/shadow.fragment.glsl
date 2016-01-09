precision mediump float;

// http://stackoverflow.com/questions/18453302/how-do-you-pack-one-32bit-int-into-4-8bit-ints-in-glsl-webgl
const vec4 bitSh = vec4(256. * 256. * 256., 256. * 256., 256., 1.);
const vec4 bitMsk = vec4(0.,vec3(1./256.0));

vec4 pack (float depth) {
    vec4 comp = fract(depth * bitSh);
    comp -= comp.xxyz * bitMsk;
    return comp;
}

/*vec4 pack(float depth) {
  return vec4(depth, 0, 0, 0);
}*/

void main() {
  gl_FragColor = pack(gl_FragCoord.z);
}
