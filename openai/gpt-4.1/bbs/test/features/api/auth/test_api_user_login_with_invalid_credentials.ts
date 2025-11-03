import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that login with invalid password fails and does not grant session.
 *
 * This test:
 *
 * 1. Registers a new user (valid email, password, display_name, avatar_url)
 * 2. Attempts to log in with the correct email but an incorrect password
 * 3. Asserts that an error occurs and that no successful session context is
 *    returned
 */
export async function test_api_user_login_with_invalid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Register a new user
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12), // must be min 8 chars
    display_name: RandomGenerator.name(),
    avatar_url: null,
  } satisfies IDiscussionBoardUser.ICreate;
  const registered: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });
  typia.assert(registered);
  // Step 2: Attempt login with correct email but invalid password
  const loginBody = {
    email: registrationBody.email,
    password: registrationBody.password + "zz", // Definitely not the real password
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardUser.ILogin;
  await TestValidator.error(
    "login must fail with invalid password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: loginBody,
      });
    },
  );
}
