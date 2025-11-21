import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_refresh_user_not_found(
  connection: api.IConnection,
) {
  // Generate a valid Base64-encoded JWT format string (Header.Payload.Signature)
  const header = typia.random<string & tags.Format<"uuid">>();
  const payload = typia.random<string & tags.Format<"uuid">>();
  const signature = typia.random<string & tags.Format<"uuid">>();

  // Create a valid-looking JWT token using Base64Url encoding pattern (without padding)
  // This is a properly formatted mock JWT for testing, not a real one
  const invalidRefreshToken =
    Buffer.from(header)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ".") +
    "." +
    Buffer.from(payload)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ".") +
    "." +
    Buffer.from(signature)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ".");

  // Attempt to refresh token with a refresh token that references non-existent moderator
  await TestValidator.error(
    "refresh token for non-existent moderator should fail",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: invalidRefreshToken,
      });
    },
  );
}
