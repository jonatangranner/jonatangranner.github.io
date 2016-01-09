precision mediump float;

attribute vec3 aPosition, aNormal;
uniform   mat4 uM, uV, uP;
varying   vec3 R;
varying   vec3 normal, pos, light;

const vec4 lightDirection = vec4(0.0, -1.0, 0.0, 0.0);

void main() {
  R = (uM * vec4(aNormal, 0)).xyz;

  // Calculate position and normal vector
  normal = (uV * uM * vec4(aNormal, 0)).xyz;
  pos = (uV * uM * vec4(aPosition, 1)).xyz;
  light = (uV * uM * (-lightDirection)).xyz;

  // Set position
  gl_Position = uP * uV * uM * vec4(aPosition, 1);
}
