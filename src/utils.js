module.exports = {
  IO_NET_CONTAINER_PREFIX: "ionetcontainers",
  envVariableCheck: function (envVariable) {
    const variable = process.env[envVariable];

    if (!variable) {
      throw new Error(`Environment variable ${envVariable} is missing`);
    }

    return variable;
  },
};
