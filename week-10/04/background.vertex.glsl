precision mediump float;

attribute vec3 aPosition;
uniform   mat4 uMinv, uVinv, uPinv;
varying   vec3  texCoord;

void main() {
  mat4 M = uMinv * uVinv * uPinv;
  texCoord = (M * vec4(aPosition, 1)).xyz;

  // Set position
  gl_Position = vec4(aPosition, 1);
}
