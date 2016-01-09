precision mediump float;

uniform sampler2D texMap;
uniform sampler2D shadowMap;
uniform int isShadow;
varying vec2 fTexCoord;
varying vec4 positionFromLight;

const vec4 bitShift = vec4(256. * 256. * 256., 256. * 256., 256., 1.);
const vec4 bitShifts = vec4(1.) / bitShift;

float unpack (vec4 color) {
    return dot(color, bitShifts);
}


void main() {
  vec4 color = texture2D(texMap, fTexCoord);

  // Is in shadow
  vec3 shadowCoord = (positionFromLight.xyz / positionFromLight.w) * 0.5 + 0.5;
  vec4 rgbaDepth = texture2D(shadowMap, shadowCoord.xy);
  float depth = unpack(rgbaDepth);
  float visibility = (shadowCoord.z > depth + 0.0005) ? 0.3 : 1.0;

  // Set color
  gl_FragColor = vec4(color.rgb * visibility, color.a);
}
