precision mediump float;

attribute vec3 aPosition, aNormal;
attribute vec4 aColor;
uniform   mat4 uM, uV, uR, uP;
uniform   mat4 uLightV;
uniform   vec4 lightDirection;
varying   vec3 matrialColor, normal, pos, light;
varying   vec4 positionFromLight;

void main() {
  // Calculate material color
  matrialColor = aColor.xyz;

  // Calculate position and normal vector
  normal = (uV * uM * vec4(aNormal, 0)).xyz;
  pos = (uV * uM * vec4(aPosition, 1)).xyz;
  light = (uV * uM * (-lightDirection)).xyz;

  // Set position
  positionFromLight = uP * uLightV * uM * vec4(aPosition, 1);
  gl_Position = uP * uV * uR * uM * vec4(aPosition, 1);
}
