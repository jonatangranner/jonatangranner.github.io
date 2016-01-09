precision mediump float;

attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform   mat4 uM, uV, uP;
uniform   mat4 uLightV;
varying vec2 fTexCoord;
varying vec4 positionFromLight;

void main() {
  fTexCoord = aTexCoord;

  positionFromLight = uP * uLightV * uM * vec4(aPosition, 1);
  gl_Position = uP * uV * uM * vec4(aPosition, 1);
}
