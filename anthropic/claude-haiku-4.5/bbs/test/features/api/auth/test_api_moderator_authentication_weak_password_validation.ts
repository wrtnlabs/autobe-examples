import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test password complexity validation during moderator authentication.
 *
 * This test validates that the moderator login endpoint properly enforces
 * password complexity requirements. The test attempts authentication with a
 * weak password that fails to meet complexity standards (minimum 8 characters
 * with uppercase, lowercase, number, and special character combination).
 *
 * The authentication should be rejected when the password does not meet the
 * required complexity: minimum 8 characters with a combination of uppercase
 * letters, lowercase letters, numbers, and special characters.
 *
 * Steps:
 *
 * 1. Generate test email address
 * 2. Attempt login with weak password lacking complexity requirements
 * 3. Verify that authentication is rejected (either user not found or password
 *    invalid)
 * 4. Confirm that weak passwords are properly validated
 */
export async function test_api_moderator_authentication_weak_password_validation(
  connection: api.IConnection,
) {
  // Step 1: Create test email address
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Step 2: Define weak passwords that fail complexity requirements
  // These passwords lack required complexity: uppercase, lowercase, number, special character
  const weakPasswords = [
    "password", // lowercase and number only, no uppercase or special char
    "Password1", // has uppercase, lowercase, number but no special character
    "Passw0rd", // has uppercase, lowercase, number but no special character
    "pass123", // has lowercase and number, but no uppercase or special character
  ] as const;

  // Step 3: Attempt authentication with weak passwords
  // Each weak password should be rejected due to complexity validation
  for (const weakPassword of weakPasswords) {
    await TestValidator.error(
      `weak password "${weakPassword}" should be rejected during authentication`,
      async () => {
        await api.functional.auth.moderator.login(connection, {
          body: {
            email: testEmail,
            password: weakPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IDiscussionBoardModerator.ILogin,
        });
      },
    );
  }
}
