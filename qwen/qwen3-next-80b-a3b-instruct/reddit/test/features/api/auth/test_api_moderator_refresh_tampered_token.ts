import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_refresh_tampered_token(
  connection: api.IConnection,
) {
  // Generate a valid refresh token using system's own random generator
  const validRefreshToken: ICommunityBBSModerator.IRefresh =
    typia.random<ICommunityBBSModerator.IRefresh>();

  // Split JWT into its three parts: header.payload.signature
  const parts = validRefreshToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }

  // Base64 decode the payload section (middle part)
  const decodedPayload = Buffer.from(parts[1], "base64").toString("utf8");
  const payload = JSON.parse(decodedPayload);

  // Tamper: Modify a real business-critical field (e.g., issuer) to invalidate signature
  // Tampering is done within the actual payload content, not random string manipulation
  payload.iss = "tampered.example.com";

  // Re-encode the tampered payload
  const tamperedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  // Reconstruct token with header, tampered payload, and original signature
  // This keeps the structure valid but breaks signature verification
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

  // Attempt to refresh with tampered token - must reject with 401 Unauthorized
  await TestValidator.error(
    "tampered refresh token should be rejected with 401",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: tamperedToken,
      });
    },
  );
}
