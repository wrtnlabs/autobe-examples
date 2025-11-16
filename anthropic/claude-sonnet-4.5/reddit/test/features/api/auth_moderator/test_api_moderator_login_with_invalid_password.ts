import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test moderator login authentication failure with invalid password.
 *
 * This test validates that the moderator login endpoint properly rejects
 * authentication attempts when an incorrect password is provided. The test
 * creates a valid moderator account first, then attempts to authenticate using
 * the correct email address but an intentionally wrong password.
 *
 * Expected behavior:
 *
 * 1. Moderator account creation succeeds with valid credentials
 * 2. Login attempt with wrong password fails with authentication error
 * 3. No tokens are issued for failed authentication
 * 4. Error handling maintains security by not revealing account existence
 *
 * Steps:
 *
 * 1. Create a moderator account with known credentials
 * 2. Attempt login with correct email but wrong password
 * 3. Verify that the login request is rejected with appropriate error
 */
export async function test_api_moderator_login_with_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a valid moderator account
  const correctPassword = "SecurePassword123!";
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const joinData = {
    email: moderatorEmail,
    password: correctPassword,
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const createdModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinData,
    });

  typia.assert(createdModerator);

  // Step 2: Attempt login with correct email but wrong password
  const wrongPassword = "WrongPassword999!";

  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: moderatorEmail,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunityModerator.ILogin,
      });
    },
  );
}
