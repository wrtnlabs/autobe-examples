import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test login failure when attempting to authenticate with correct email but
 * incorrect password.
 *
 * This test validates the authentication security mechanism by ensuring that
 * login attempts with valid email but invalid password credentials are properly
 * rejected. The system must validate the password against the bcrypt hash and
 * reject mismatched credentials without revealing which specific credential
 * (email or password) was incorrect.
 *
 * Test workflow:
 *
 * 1. Register a new member account with known email and password credentials
 * 2. Verify the registration succeeded and account was created
 * 3. Attempt to login using the correct email but with an intentionally wrong
 *    password
 * 4. Verify that the login attempt fails with an authentication error
 * 5. Confirm that no session tokens are issued and authentication is properly
 *    denied
 */
export async function test_api_member_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new member with known credentials
  const testEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = typia.random<string & tags.Format<"password">>();
  const testUsername = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<30>
  >();

  const registrationData = {
    email: testEmail,
    password: correctPassword,
    username: testUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationData,
    });

  typia.assert(registeredMember);

  // Step 2: Verify registration succeeded
  TestValidator.equals(
    "registered email matches",
    registeredMember.email,
    testEmail,
  );
  TestValidator.equals(
    "registered username matches",
    registeredMember.username,
    testUsername,
  );

  // Step 3: Attempt login with correct email but WRONG password
  const wrongPassword = correctPassword + "_WRONG_SUFFIX";

  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: testEmail,
          password: wrongPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
