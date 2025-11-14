import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_if_no_session_in_database(
  connection: api.IConnection,
) {
  const refresh_token: string = `refresh_${typia.random<string & tags.Format<"uuid">>()}`;

  await TestValidator.error(
    "refresh should fail when no session exists",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
