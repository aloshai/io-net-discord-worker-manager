const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  start: new SlashCommandBuilder()
    .setName("start")
    .setDescription("Starting worker containers"),
  shell: new SlashCommandBuilder()
    .setName("shell")
    .setDescription("Run a shell command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("The command to run")
        .setRequired(true)
    ),

  stop: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stopping worker containers"),

  restart: new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Restart worker containers"),

  resume: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume worker containers"),

  pause: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause worker containers"),

  status: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Get the status of worker containers"),
};
