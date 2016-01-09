precision mediump float;

uniform sampler2D texMap;
uniform sampler2D shadowMap;
uniform int isShadow;
varying vec2 fTexCoord;
varying vec4 positionFromLight;

// http://stackoverflow.com/questions/18453302/how-do-you-pack-one-32bit-int-into-4-8bit-ints-in-glsl-webgl
const vec4 bitSh = vec4(256. * 256. * 256., 256. * 256., 256., 1.);
const vec4 bitShifts = vec4(1.) / bitSh;

float unpack (vec4 color) {
    return dot(color, bitShifts);
}

/*float unpack(vec4 color) {
  return color.r;
}*/

void main() {
  vec4 color = texture2D(texMap, fTexCoord);

  // Is in shadow
  vec3 shadowCoord = (positionFromLight.xyz / positionFromLight.w) * 0.5 + 0.5;
  vec4 rgbaDepth = texture2D(shadowMap, shadowCoord.xy);
  float depth = unpack(rgbaDepth);
  float visibility = (shadowCoord.z > depth + 0.0005) ? 0.3 : 1.0;

  // Set color
  gl_FragColor = vec4(color.rgb * visibility, 0.5);
}
