precision mediump float;

uniform samplerCube envMap;
varying   vec3  R;

uniform   float u_ka, u_kd, u_ks, u_alpha;
varying   vec3  pos, normal, light;

const float u_L = 1.0;
const vec3 lightColor = vec3(1.0, 1.0, 1.0);

void main() {
  vec3 matrialColor = textureCube(envMap, R).xyz;

  vec3 E = normalize(pos); // eye vector
  vec3 N = normalize(normal); // normal vector
  vec3 L = normalize(light);

  vec3 H = normalize(L + E);

  // Calculate angles
  float cos_theta = dot(L, N);
  float cos_psi = dot(N, H);

  // Calculate light products
  vec3 ambientProduct = (u_ka * matrialColor) * (u_L * lightColor);
  vec3 diffuseProduct = (u_kd * matrialColor) * (u_L * lightColor);
  vec3 specularProduct = (u_ks * matrialColor) * (u_L * lightColor);

  // Calculate light results
  vec3 ambient = ambientProduct;
  vec3 diffuse = max(cos_theta, 0.0) * diffuseProduct;
  vec3 specular = pow(max(cos_psi, 0.0), u_alpha) * specularProduct;
  if (cos_theta < 0.0) {
    specular = vec3(0.0, 0.0, 0.0);
  }

  // Sum up light contributions
  vec4 color = vec4(ambient + diffuse + specular, 1.0);

  // Set color
  gl_FragColor = vec4(color.rgb, color.a);
}
