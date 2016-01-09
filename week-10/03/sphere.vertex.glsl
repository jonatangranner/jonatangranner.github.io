precision mediump float;

attribute vec3 aPosition, aNormal;
uniform   mat4 uM, uV, uP;
varying   vec3 normalWorld, posWorld;
varying   vec3 normalView, posView, lightView;

const vec4 lightDirection = vec4(0.0, -1.0, 0.0, 0.0);

void main() {
  normalWorld = (uM * vec4(aNormal, 0)).xyz;
  posWorld = (uM * vec4(aPosition, 1)).xyz;

  // Calculate position and normal vector
  normalView = (uV * uM * vec4(aNormal, 0)).xyz;
  posView = (uV * uM * vec4(aPosition, 1)).xyz;
  lightView = (uV * uM * (-lightDirection)).xyz;

  // Set position
  gl_Position = uP * uV * uM * vec4(aPosition, 1);
}
