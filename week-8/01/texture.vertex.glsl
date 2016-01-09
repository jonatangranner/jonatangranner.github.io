precision mediump float;

attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform   mat4 uM;
uniform   mat4 uV;
uniform   mat4 uP;
varying vec2 fTexCoord;

void main() {
  fTexCoord = aTexCoord;
  gl_Position = uP * uV * uM * vec4(aPosition, 1);
}
