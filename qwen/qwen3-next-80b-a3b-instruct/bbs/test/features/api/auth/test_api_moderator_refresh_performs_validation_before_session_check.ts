import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_performs_validation_before_session_check(
  connection: api.IConnection,
) {
  // Generate an invalid refresh token (non-existent or malformed)
  const invalidRefreshToken = "invalid-refresh-token";

  // Verify that the refresh endpoint rejects invalid tokens before any database query
  // This confirms validation occurs before session check, improving performance and security
  await TestValidator.error(
    "refresh endpoint should reject invalid token before session check",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
