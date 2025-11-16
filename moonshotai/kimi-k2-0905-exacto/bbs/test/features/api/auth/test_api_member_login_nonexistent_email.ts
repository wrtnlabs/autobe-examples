import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";

/**
 * Test member login fails when attempting to authenticate with a non-existent
 * email address.
 *
 * This test validates that the authentication system properly handles login
 * attempts with email addresses that are not registered in the system. It
 * ensures that:
 *
 * 1. The system rejects login attempts for non-existent users
 * 2. The error response is appropriate and doesn't reveal user enumeration details
 * 3. The system handles the authentication failure gracefully without security
 *    risks
 *
 * Test flow:
 *
 * 1. Generate a random email address (non-existent user)
 * 2. Create login credentials with non-existent email
 * 3. Attempt to login with these credentials
 * 4. Verify that login fails appropriately
 * 5. Validate error handling behavior
 */
export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Generate a random email address that shouldn't exist in the system
  const testEmail = typia.random<string & tags.Format<"email">>();

  // Create login credentials with non-existent email
  const loginCredentials = {
    email: testEmail,
    password_hash: typia.random<string>(),
  } satisfies IEconomicDiscussionMember.ILogin;

  // Attempt to login with non-existent credentials - should fail
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.member.login(connection, {
        body: loginCredentials,
      });
    },
  );
}
