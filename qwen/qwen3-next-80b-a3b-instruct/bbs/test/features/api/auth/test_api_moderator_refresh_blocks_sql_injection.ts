import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_blocks_sql_injection(
  connection: api.IConnection,
) {
  const invalidRefreshToken =
    "jwt.token'; DROP TABLE political_forum_moderator_sessions; --";

  await TestValidator.error(
    "SQL injection in refresh token should be blocked with 400 Bad Request",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
