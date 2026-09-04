import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;

const APP_ID = "e223e931725640a88bcb26788c89394a";
const APP_CERTIFICATE = "6f3b5dfc367a464fb7a445fffb3a1424";
const channelName = "test";
const uid = 0;
const role = RtcRole.PUBLISHER;
const currentTimestamp = Math.floor(Date.now() / 1000);
const privilegeExpiredTs = currentTimestamp + 3600;

try {
  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
  console.log("TOKEN OK:", token);
} catch (e) {
  console.error("TOKEN ERROR:", e);
}
