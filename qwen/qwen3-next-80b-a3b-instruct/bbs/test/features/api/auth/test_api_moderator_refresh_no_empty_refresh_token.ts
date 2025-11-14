import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_no_empty_refresh_token(
  connection: api.IConnection,
) {
  const emptyRefreshToken = "";
  await TestValidator.error(
    "empty refresh token should fail with 400 Bad Request",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: emptyRefreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
