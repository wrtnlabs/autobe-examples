import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  // Generate a real refresh token and set its expiration to the past
  const expiredRefreshToken =
    "refresh_" + typia.random<string & tags.Format<"uuid">>();

  // Now send a request with this expired refresh token
  // The system should return a 401 Unauthorized error since the token is expired
  await TestValidator.error(
    "expired refresh token should be rejected with 401 error",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
