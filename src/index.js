const COMMANDS = require("./commands");
const { exec } = require("child_process");
const os = require("os");

const dotenv = require("dotenv");
const { Client, EmbedBuilder, REST, Routes } = require("discord.js");
const { CronJob } = require("cron");
const Dockerode = require("dockerode");
const { envVariableCheck, IO_NET_CONTAINER_PREFIX } = require("./utils");

dotenv.config();

const docker = new Dockerode();

if (!docker) {
  throw new Error("Docker not found");
}

const DISCORD_TOKEN = envVariableCheck("DISCORD_TOKEN");
const DISCORD_USER_ID = envVariableCheck("DISCORD_USER_ID");

const ENABLE_WORKER_AUTO_RESTART =
  envVariableCheck("ENABLE_WORKER_AUTO_RESTART") === "true";
const WORKER_COMMAND = process.env.WORKER_COMMAND;
const ENABLE_WORKER_STATUS_MESSAGE =
  envVariableCheck("ENABLE_WORKER_STATUS_MESSAGE") === "true";

const client = new Client({
  intents: ["DirectMessages", "Guilds", "GuildMessages"],
});

const statusMessageJob = new CronJob("*/10 * * * * *", async () => {
  if (!ENABLE_WORKER_STATUS_MESSAGE) {
    return;
  }

  const user = await client.users.fetch(DISCORD_USER_ID);

  if (!user) {
    console.error("User not found");
    return;
  }

  const channel = await user.createDM();

  if (!channel) {
    console.error("Channel not found");
    return;
  }

  const comparedStatuses = await compareStatuses();

  if (!comparedStatuses.isChanged) {
    return;
  }

  const embed = await createStatusEmbed();

  await channel.send({
    embeds: [embed],
  });
});

client.once("ready", async () => {
  const user = await client.users.fetch(DISCORD_USER_ID);

  if (!user) {
    console.error("User not found");
    process.exit(1);
  }

  const channel = await user.createDM();

  if (!channel) {
    console.error("Channel not found");
    process.exit(1);
  }

  statusMessageJob.start();

  updateSlashCommands(client.application.id);

  console.log("Bot is ready");
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.user.id !== DISCORD_USER_ID) return;

  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === "start") {
    await interaction.reply("⏳ Processing command...");
    await startWorkerCommand(interaction, true);
    return;
  }

  if (commandName === "stop") {
    await interaction.reply("⏳ Processing command...");
    await stopAllContainers();
    await interaction.editReply("✅ All IO containers successfully stopped");
    return;
  }

  if (commandName == "restart") {
    await interaction.reply("⏳ Processing command...");
    await restartAllContainers(interaction, true);
    await interaction.editReply("✅ All IO containers successfully restarted");
    return;
  }

  if (commandName === "pause") {
    await interaction.reply("⏳ Processing command...");

    const activeContainers = await getIoContainers();

    if (activeContainers.length === 0) {
      await interaction.editReply("❌ No active containers found");
      return;
    }

    await pauseAllContainers();
    await interaction.editReply("✅ All IO containers successfully paused");
    return;
  }

  if (commandName === "resume") {
    await interaction.reply("⏳ Processing command...");

    const activeContainers = await getIoContainers();

    if (activeContainers.length === 0) {
      await interaction.editReply("❌ No active containers found");
      return;
    }

    await resumeAllContainers();
    await interaction.editReply("✅ All IO containers successfully resumed");
    return;
  }

  if (commandName === "shell") {
    const command = interaction.options.getString("command");

    if (!command) {
      await interaction.reply("❌ Command is required");
      return;
    }

    await runShellCommand(interaction, command);
    return;
  }

  if (commandName === "status") {
    const embed = await createStatusEmbed();

    await interaction.reply({ embeds: [embed] });

    return;
  }

  if (commandName == "status") {
    const embed = await createStatusEmbed();

    await interaction.reply({ embeds: [embed] });

    return;
  }
});

async function updateSlashCommands(applicationId) {
  const arr = [
    COMMANDS.shell,
    COMMANDS.start,
    COMMANDS.stop,
    COMMANDS.restart,
    COMMANDS.pause,
    COMMANDS.resume,
  ];

  const commands = arr.map((command) => command.toJSON());

  const rest = new REST().setToken(DISCORD_TOKEN);

  await rest
    .put(Routes.applicationCommands(applicationId), {
      body: commands,
    })
    .then(() => {
      console.log("Successfully registered application commands.");
    })
    .catch(console.error);
}

let oldStatuses = null;

async function compareStatuses() {
  const newStatuses = await getContainerStatuses();

  if (oldStatuses === null) {
    oldStatuses = newStatuses;
    return {
      isChanged: true,
      changedStatuses: [],
    };
  }

  const changedStatuses = newStatuses.filter((newStatus) => {
    const oldStatus = oldStatuses.find(
      (status) => status.image === newStatus.image
    );

    if (!oldStatus) {
      return false;
    }

    return oldStatus.status !== newStatus.status;
  });

  oldStatuses = newStatuses;

  const isChanged = changedStatuses.length > 0;

  return {
    isChanged,
    changedStatuses,
  };
}

async function createStatusEmbed() {
  const containers = await getContainerStatuses();

  const embed = new EmbedBuilder()
    .setTitle("IO Container Status")
    .setDescription("Current status of IO containers")
    .setTimestamp()
    .setColor("#0099ff")
    .setFooter({
      text:
        "Worker Auto Restart: " +
        (ENABLE_WORKER_AUTO_RESTART == true ? "✅ Enabled" : "❌ Disabled"),
    });

  containers.forEach((container) => {
    const prefix = container.status == "running" ? "🟢" : "🔴";
    embed.addFields({
      name: container.image,
      value: `${prefix} ${container.status}`,
    });
  });

  return embed;
}

async function getContainerStatuses() {
  const containers = await getIoContainers();

  if (containers.length === 0) {
    return [];
  }

  const statuses = containers.map((container) => {
    return {
      image: container.Image.split("@")[0],
      status: container.State,
    };
  });

  return statuses;
}

async function runShellCommand(interaction, command) {
  try {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        interaction.reply(
          "❌ An error occurred while executing the command\n\n**Error:**" +
            error.message
        );
        return;
      }

      interaction.reply(stdout);
    });
  } catch (error) {
    console.error(error);
    interaction.reply(
      "❌ An error occurred while executing the command\n\n**Error:**" +
        error.message
    );
  }
}

// Restart containers is not good practice for the io containers
async function restartAllContainers() {
  await startWorkerAsync(true);
}

async function pauseAllContainers() {
  const containers = await getIoContainers();

  if (containers.length === 0) {
    return;
  }

  for (const container of containers) {
    try {
      await docker.getContainer(container.Id).pause();
    } catch (error) {
      console.error(error);
    }
  }
}

async function resumeAllContainers() {
  const containers = await getIoContainers();

  if (containers.length === 0) {
    return;
  }

  for (const container of containers) {
    try {
      await docker.getContainer(container.Id).unpause();
    } catch (error) {
      console.error(error);
    }
  }
}

async function stopAllContainers() {
  const containers = await getIoContainers();

  if (containers.length === 0) {
    return;
  }

  for (const container of containers) {
    try {
      await docker.getContainer(container.Id).remove({
        force: true,
      });
    } catch (error) {
      console.error(error);
    }
  }
}

async function chmodScriptMac() {
  const cmd = "chmod +x launch_binary_mac";

  const promise = new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        reject("❌ An error occurred while executing the command");
        return;
      }

      resolve("✅ Script permissions updated successfully");
    });
  });

  return promise;
}

async function chmodScriptLinux() {
  const cmd = "chmod +x launch_binary_linux";

  const promise = new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        reject("❌ An error occurred while executing the command");
        return;
      }

      resolve("✅ Script permissions updated successfully");
    });
  });

  return promise;
}

async function downloadBinaryLinux() {
  const cmd =
    "curl -L https://github.com/ionet-official/io_launch_binaries/raw/main/launch_binary_linux -o launch_binary_linux";

  const promise = new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        reject("❌ An error occurred while downloading the binary");
        return;
      }

      resolve("✅ Binary downloaded successfully");
    });
  });

  return promise;
}

async function downloadBinaryMac() {
  const cmd =
    "curl -L https://github.com/ionet-official/io_launch_binaries/raw/main/launch_binary_mac -o launch_binary_mac";

  const promise = new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        reject("❌ An error occurred while downloading the binary");
        return;
      }

      resolve("✅ Binary downloaded successfully");
    });
  });

  return promise;
}

async function startWorkerAsync(removeContainers = false) {
  if (removeContainers) {
    await stopAllContainers();
  }

  const platform = os.platform();

  if (platform === "linux") {
    await downloadBinaryLinux();
    await chmodScriptLinux();
  }

  if (platform === "darwin") {
    await downloadBinaryMac();
    await chmodScriptMac();
  }

  const promise = new Promise((resolve, reject) => {
    exec(WORKER_COMMAND, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        reject("❌ An error occurred while executing the command");
        return;
      }

      resolve("✅ Worker Command executed successfully");
    });
  });

  return promise;
}

async function startWorkerCommand(interaction, removeContainers = false) {
  const result = await startWorkerAsync(removeContainers);
  interaction.editReply(result);
}

async function getIoContainers() {
  const allContainers = await docker.listContainers();

  if (allContainers.length === 0) {
    return [];
  }

  const ioContainers = allContainers.filter((container) =>
    container.Image.startsWith(IO_NET_CONTAINER_PREFIX)
  );

  return ioContainers;
}

let isBusy = false;

const job = new CronJob("*/10 * * * * *", async () => {
  if (!ENABLE_WORKER_AUTO_RESTART || isBusy) {
    return;
  }

  const ioContainers = await getIoContainers();

  if (ioContainers.length !== 0) {
    return;
  }

  isBusy = true;
  await startWorkerAsync(true);
  isBusy = false;
});

job.start();

client.login(DISCORD_TOKEN);
