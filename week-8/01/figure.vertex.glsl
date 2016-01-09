precision mediump float;

attribute vec3 aPosition, aNormal;
attribute vec4 aColor;
uniform   mat4 uM, uV, uP;
varying   vec3 matrialColor, normal, pos, light;
uniform   vec4 lightDirection;

void main() {
  // Calculate material color
  matrialColor = aColor.xyz;

  // Calculate position and normal vector
  normal = (uV * uM * vec4(aNormal, 0)).xyz;
  pos = (uV * uM * vec4(aPosition, 1)).xyz;
  light = (uV * uM * (-lightDirection)).xyz;

  // Set position
  gl_Position = uP * uV * uM * vec4(aPosition, 1);
}
