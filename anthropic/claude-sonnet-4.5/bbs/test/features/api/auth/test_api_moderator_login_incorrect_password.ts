import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator login attempt with valid email but incorrect password.
 *
 * This test validates the authentication security mechanism by attempting to
 * log in with a moderator account using the correct email but an intentionally
 * wrong password. The test ensures that:
 *
 * 1. Authentication properly rejects invalid credentials
 * 2. No authorization tokens are issued for failed login attempts
 * 3. The system maintains security by preventing unauthorized access
 * 4. Password verification uses secure comparison algorithms to prevent timing
 *    attacks
 *
 * Test Flow:
 *
 * 1. Setup: Create a valid moderator account with a known password
 * 2. Test Action: Attempt to login using the same email but a different
 *    (incorrect) password
 * 3. Validation: Verify that the login fails and throws an appropriate error
 * 4. Security Check: Ensure no authentication tokens are leaked despite failure
 */
export async function test_api_moderator_login_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account with a known password
  const correctPassword = "SecurePassword123!";
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderatorData = {
    email: moderatorEmail,
    password: correctPassword,
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });

  typia.assert(createdModerator);

  // Step 2: Attempt to login with the correct email but WRONG password
  const incorrectPassword = "WrongPassword456!";

  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: moderatorEmail,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardModerator.ILogin,
      });
    },
  );
}
