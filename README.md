# io-net-discord-worker-manager

A simple bot project where you can manage your IO.NET Worker via Discord bot.

## Prerequisites

- [Node.js v18 or higher](https://nodejs.org/)
- [Discord Bot Token](https://discord.com/developers/applications)
- [IO.NET Worker](https://io.net)

## Installation

1. Clone this repository

```bash
git clone https://github.com/aloshai/io-net-discord-worker-manager.git
```

2. Open the project directory

```bash
cd io-net-discord-worker-manager
```

3. Install the dependencies

```bash
npm install
```

4. Create a `.env` file in the project directory and add the following:

```env
# Your Discord Bot Token
DISCORD_TOKEN=YOUR_DISCORD_BOT_TOKEN

# Your Discord User ID
DISCORD_USER_ID=YOUR_DISCORD_USER_ID

# Your IO.NET run worker command
WORKER_COMMAND=YOUR_WORKER_COMMAND

# Enable auto restart worker
ENABLE_WORKER_AUTO_RESTART=true

# Enable worker status message
ENABLE_WORKER_STATUS_MESSAGE=true
```

5. Start the bot

```bash
npm run start
```

## Commands

- `/start` - Starts Worker using `WORKER_COMMAND`
- `/stop` - Stops Worker containers
- `/restart` - Restarts Worker containers
- `/status` - Shows Worker containers status
- `/pause` - Pauses Worker containers
- `/resume` - Resumes Worker containers

## Example ENV

```env
DISCORD_TOKEN=TWEySDE4Mzc1OTE4DASAW.GYNdDSg.vFDMlGFHBHc_uGA2DFFB5TFSqleolqK-ljC-E

DISCORD_USER_ID=956157077083013150

WORKER_COMMAND=docker run -d -v /var/run/docker.sock:/var/run/docker.sock -e DEVICE_NAME="example_device" -e DEVICE_ID=<DEVICE-ID> -e USER_ID=<user-id> -e OPERATING_SYSTEM="<operation-system>" -e USEGPUS=<any> --pull always ionetcontainers/io-launch:v0.1

ENABLE_WORKER_AUTO_RESTART=true

ENABLE_WORKER_STATUS_MESSAGE=true
```

## Another Projects

- [IO.NET Meme Generator](https://io-net-memegenerator.vercel.app/)
