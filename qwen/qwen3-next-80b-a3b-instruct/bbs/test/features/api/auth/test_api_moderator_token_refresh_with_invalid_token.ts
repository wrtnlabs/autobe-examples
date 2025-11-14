import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_token_refresh_with_invalid_token(
  connection: api.IConnection,
) {
  // Generate a completely invalid refresh token (random string)
  const invalidToken = RandomGenerator.alphaNumeric(32);

  // Verify system rejects invalid refresh token with 401 Unauthorized
  await TestValidator.error(
    "invalid refresh token should fail with 401 Unauthorized",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
