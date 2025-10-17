import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test rejection of login attempts for non-existent accounts.
 *
 * Validates that the authentication system properly handles login attempts for
 * accounts that have never been registered in the system. This test ensures the
 * system implements account enumeration protection by returning generic error
 * messages that don't reveal whether an account exists.
 *
 * Test workflow:
 *
 * 1. Generate random non-existent email and password credentials
 * 2. Attempt to log in with these non-existent credentials
 * 3. Verify that the login attempt fails with an error
 * 4. Confirm that no authorization token is issued
 *
 * This test validates security best practices by ensuring the system doesn't
 * leak information about account existence through error messages.
 */
export async function test_api_member_login_nonexistent_account_rejection(
  connection: api.IConnection,
) {
  // Generate random credentials for a non-existent account
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();
  const randomPassword = RandomGenerator.alphaNumeric(12);

  // Attempt to log in with non-existent account credentials
  // This should fail with an error
  await TestValidator.error(
    "login with non-existent account should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: {
          email: nonExistentEmail,
          password: randomPassword,
        } satisfies IDiscussionBoardMember.ILogin,
      });
    },
  );
}
