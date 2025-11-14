import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_token_not_logged(
  connection: api.IConnection,
) {
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "invalid refresh token should return 401 unauthorized",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
