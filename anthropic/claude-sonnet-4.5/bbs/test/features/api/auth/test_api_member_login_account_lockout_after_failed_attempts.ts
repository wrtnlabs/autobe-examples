import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the brute-force protection mechanism with account lockout after failed
 * login attempts.
 *
 * This test validates the security feature that temporarily locks user accounts
 * after multiple consecutive failed login attempts to prevent automated
 * password guessing attacks.
 *
 * Steps:
 *
 * 1. Create a new member account with known credentials
 * 2. Attempt login 5 times with correct email but incorrect password
 * 3. Verify account is locked after the 5th failed attempt
 * 4. Verify login with correct password is rejected during lockout period
 * 5. Confirm rejection indicates temporary restriction due to failed attempts
 */
export async function test_api_member_login_account_lockout_after_failed_attempts(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with known credentials
  const correctPassword = "SecurePass123!@#";
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);

  const createdMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: correctPassword,
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(createdMember);

  // Create a fresh connection without authentication for login attempts
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 2: Attempt login 5 times with correct email but incorrect password
  const incorrectPassword = "WrongPassword123!";
  const maxFailedAttempts = 5;

  for (let attempt = 1; attempt <= maxFailedAttempts; attempt++) {
    await TestValidator.error(
      `failed login attempt ${attempt} should be rejected`,
      async () => {
        await api.functional.auth.member.login(unauthConn, {
          body: {
            email: memberEmail,
            password: incorrectPassword,
          } satisfies IDiscussionBoardMember.ILogin,
        });
      },
    );
  }

  // Step 3 & 4: After 5 failed attempts, verify that login with correct password is rejected
  await TestValidator.error(
    "login should fail during lockout period even with correct password",
    async () => {
      await api.functional.auth.member.login(unauthConn, {
        body: {
          email: memberEmail,
          password: correctPassword,
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
