export const OAUTH_SCOPES = [
  "bot",
  "connections",
  "dm_channels.read",
  "email",
  "identify",
  "guilds",
  "guilds.join",
  "guilds.members.read",
  "gdm.join",
  "messages.read",
  "role_connections.write",
  "rpc",
  "rpc.activities.write",
  "rpc.voice.read",
  "rpc.voice.write",
  "rpc.notifications.read",
  "webhook.incoming",
  "voice",
  "applications.builds.upload",
  "applications.builds.read",
  "applications.store.update",
  "applications.entitlements",
  "relationships.read",
  "activities.read",
  "activities.write",
  "applications.commands",
  "applications.commands.update",
  "applications.commands.permissions.update"
];

export const DO_NOT_DISABLE = [
  "bot",
  "applications.commands",
  "guilds",
  "identify",
  "applications.entitlements",
  "role_connections.write"
];

export const PLEASE_DISABLE = ["guilds.join", "gdm.join", "dm_channels.read"];
