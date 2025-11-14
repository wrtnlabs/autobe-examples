import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_cannot_be_called_before_login(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "refresh token cannot be called before login",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
