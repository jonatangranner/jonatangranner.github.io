precision mediump float;

uniform samplerCube envMap;
varying   vec3  texCoord;

void main() {
  vec3 color = textureCube(envMap, texCoord).xyz;
  gl_FragColor = vec4(color, 1.0);
}
