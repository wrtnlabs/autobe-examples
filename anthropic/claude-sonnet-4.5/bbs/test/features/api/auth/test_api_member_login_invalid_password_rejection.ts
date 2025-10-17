import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test that the login system properly rejects authentication attempts with
 * incorrect passwords.
 *
 * This test validates the security of the member authentication system by
 * ensuring that login attempts with valid email addresses but incorrect
 * passwords are properly rejected. The system must maintain security by using
 * generic error messages that don't reveal whether the email exists, preventing
 * account enumeration attacks.
 *
 * Test workflow:
 *
 * 1. Create a new member account with known credentials through registration
 * 2. Attempt to log in using the correct email but an incorrect password
 * 3. Verify that the authentication fails with an appropriate error
 * 4. Confirm that no session tokens are issued for the failed attempt
 * 5. Validate that the account remains in a valid state
 * 6. Verify that subsequent login with correct credentials still succeeds
 */
export async function test_api_member_login_invalid_password_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with known credentials
  const correctPassword = "SecurePass123!@#";
  const memberEmail = typia.random<string & tags.Format<"email">>();

  const createMemberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: memberEmail,
    password: correctPassword,
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardMember.ICreate;

  const registeredMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createMemberBody,
    });
  typia.assert(registeredMember);

  // Step 2: Attempt to log in with correct email but incorrect password
  const incorrectPassword = "WrongPassword456$%^";

  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: memberEmail,
          password: incorrectPassword,
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );

  // Step 3: Verify that subsequent login with correct credentials succeeds
  const successfulLogin: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: correctPassword,
      } satisfies IDiscussionBoardMember.ILogin,
    });
  typia.assert(successfulLogin);

  // Step 4: Validate the successful login response
  TestValidator.equals(
    "successful login returns the same member ID",
    successfulLogin.id,
    registeredMember.id,
  );
  typia.assert(successfulLogin.token);
}
