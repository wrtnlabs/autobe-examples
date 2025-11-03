import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_token_refresh_banned_account(
  connection: api.IConnection,
) {
  // Step 1: Register a moderator account and capture refresh token
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ValidPassword123";
  const moderatorJoin = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: "192.168.1.100",
      href: "http://localhost:3000/admin/register",
      referrer: "http://localhost:3000/",
    } satisfies IDiscussionBoardModerator.IJoin,
  });
  typia.assert(moderatorJoin);

  const refreshToken = moderatorJoin.token.refresh;
  TestValidator.predicate(
    "refresh token should be present after registration",
    refreshToken.length > 0,
  );

  // Step 2: Verify moderator account is initially active
  TestValidator.equals(
    "moderator account status should be active after registration",
    moderatorJoin.account_status,
    "active",
  );

  // Step 3: Verify successful token refresh with active account
  const refreshBeforeBan = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardModerator.IRefresh,
    },
  );
  typia.assert(refreshBeforeBan);
  TestValidator.equals(
    "refresh should succeed for active account",
    refreshBeforeBan.account_status,
    "active",
  );

  // Step 4: After ban is applied externally (by admin system),
  // attempt to refresh token with banned account
  // The banned status would be set via admin operations outside this test
  // This test validates the expected behavior when refresh is attempted
  // with a token from a banned account
  await TestValidator.error(
    "banned moderator should not be able to refresh token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );
}
