import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test login failure when an incorrect password is provided for a registered
 * user.
 *
 * This test checks that the /auth/user/login endpoint securely rejects wrong
 * credentials and does not issue a token or user session. The test steps are:
 *
 * 1. Register a user with a unique email and a valid password via /auth/user/join.
 * 2. Attempt login with the same email and an invalid password.
 * 3. Assert that an error is returned and no authentication token or user details
 *    are issued, following security policy not to disclose which credential is
 *    wrong.
 */
export async function test_api_user_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1. Register user
  const email = typia.random<string & tags.Format<"email">>();
  const correctPassword = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: correctPassword,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Try incorrect login
  const invalidPassword = correctPassword + "!wrong";
  await TestValidator.error(
    "should reject login with invalid password and not issue token",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email,
          password: invalidPassword,
          href: "https://testboard.com/login", // supply plausible URL
          referrer: "https://testboard.com/",
        } satisfies IDiscussionBoardUser.ILogin,
      });
    },
  );
}
