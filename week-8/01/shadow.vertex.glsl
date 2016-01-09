precision mediump float;

attribute vec3 aPosition;
uniform   mat4 uM;
uniform   mat4 uV;
uniform   mat4 uP;

void main() {
  gl_Position = uP * uV * uM * vec4(aPosition, 1);
}
