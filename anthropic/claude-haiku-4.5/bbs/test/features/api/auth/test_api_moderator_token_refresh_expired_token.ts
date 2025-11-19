import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // Test token refresh rejection with an invalid/non-existent refresh token
  // This simulates the authentication error that occurs when a token is expired or invalid
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();

  // Attempt to refresh with an invalid refresh token
  // The API will reject this as an authentication error
  await TestValidator.error(
    "invalid refresh token should be rejected",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Verify that connection headers were not modified by the failed refresh attempt
  TestValidator.predicate(
    "failed refresh should not modify authorization header",
    connection.headers?.Authorization === undefined ||
      connection.headers?.Authorization === "",
  );
}
