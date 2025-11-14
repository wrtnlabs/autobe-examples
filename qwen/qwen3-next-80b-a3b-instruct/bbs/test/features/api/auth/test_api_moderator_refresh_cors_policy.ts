import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_cors_policy(
  connection: api.IConnection,
) {
  // Create a fresh connection with a custom Origin header, simulating an external domain request
  const untrustedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Origin: "https://malicious-site.com",
    },
  };

  // Generate a valid refresh token (non-expired, active session)
  const refreshToken: string = typia.random<string & tags.MinLength<10>>();

  // Attempt to refresh the token using the untrusted origin
  // This request should be rejected by the server without returning CORS headers
  await TestValidator.error(
    "server should reject refresh request from untrusted origin",
    async () => {
      await api.functional.auth.moderator.refresh(untrustedConnection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
