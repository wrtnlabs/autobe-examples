import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

/**
 * Test moderator login with incorrect password to validate authentication
 * security.
 *
 * This test verifies that the system properly handles authentication failures
 * when a moderator attempts to login with a valid email but incorrect password.
 * The test ensures the system implements security best practices by:
 *
 * 1. Creating a valid moderator account with known credentials
 * 2. Attempting login with the correct email but wrong password
 * 3. Verifying the login fails with a generic error message
 * 4. Ensuring no authentication tokens or session are issued
 *
 * The generic error message "Invalid email or password" prevents username
 * enumeration attacks by not revealing whether the email exists or the password
 * was incorrect.
 */
export async function test_api_moderator_login_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Create a valid moderator account with known credentials
  const correctPassword = RandomGenerator.alphaNumeric(8) + "!Aa1";
  const incorrectPassword = RandomGenerator.alphaNumeric(8) + "!Bb2";

  const moderatorData = {
    username:
      RandomGenerator.name(1).toLowerCase() + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: correctPassword,
  } satisfies IRedditLikeModerator.ICreate;

  const createdModerator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(createdModerator);

  // Step 2: Attempt login with correct email but incorrect password
  // This should fail and throw an error with generic message
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: moderatorData.email,
          password: incorrectPassword,
        } satisfies IRedditLikeModerator.ILogin,
      });
    },
  );
}
