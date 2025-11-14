import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_has_no_cross_role_leak(
  connection: api.IConnection,
) {
  const citizenRefreshToken =
    "refresh_" + typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "moderator refresh should reject citizen refresh token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: citizenRefreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
