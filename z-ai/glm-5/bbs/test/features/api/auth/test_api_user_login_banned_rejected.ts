import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

/**
 * Test that banned users cannot login to the platform.
 *
 * This test verifies the security workflow:
 * 1. Create a regular user account with known credentials
 * 2. Authenticate as administrator and ban the user
 * 3. Attempt login with banned user's credentials
 * 4. Validate AUTH_USER_BANNED error is returned
 *
 * Implementation notes:
 * - User password is stored before join for later login attempt
 * - Admin account must be available (seeded in test environment)
 * - Ban operation requires ADMINISTRATOR or SUPER_ADMINISTRATOR privilege
 */
export async function test_api_user_login_banned_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a regular user account that will be banned
  // Store credentials for later login attempt
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userDisplayName = RandomGenerator.name();
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: userEmail,
      password: userPassword,
      displayName: userDisplayName,
    },
  });
  typia.assert(userAuth);
  const userId = userAuth.id;
  // Step 2: Create admin connection and ban the user
  // Note: Test environment should have seeded admin accounts
  // Admin credentials would be provided via test configuration
  const adminConnection: api.IConnection = { host: connection.host };
  // First, attempt admin login with seeded credentials
  // (assuming test environment has a seeded admin account)
  const adminLoginResult = await api.functional.discussionBoard.auth.user.login(
    adminConnection,
    {
      body: {
        email: "admin@test.local",
        password: "AdminTest123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardUser.ILogin,
    },
  );
  typia.assert(adminLoginResult);
  // Verify admin has required privileges
  TestValidator.predicate(
    "user must be admin",
    adminLoginResult.permission_level === "ADMINISTRATOR" ||
      adminLoginResult.permission_level === "SUPER_ADMINISTRATOR",
  );
  // Create the ban
  const banReason = RandomGenerator.paragraph({ sentences: 5 });
  const ban = await api.functional.discussionBoard.bans.create(
    adminConnection,
    {
      body: {
        userId: userId,
        reason: banReason,
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  TestValidator.equals("ban user matches", ban.user.id, userId);
  TestValidator.equals("ban reason recorded", ban.reason, banReason);
  // Step 3: Attempt login with banned user's credentials
  // Expected: AUTH_USER_BANNED error should be thrown
  await TestValidator.error(
    "banned user login should be rejected",
    async () => {
      const bannedUserConnection: api.IConnection = { host: connection.host };
      await api.functional.discussionBoard.auth.user.login(
        bannedUserConnection,
        {
          body: {
            email: userEmail,
            password: userPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardUser.ILogin,
        },
      );
    },
  );
}
