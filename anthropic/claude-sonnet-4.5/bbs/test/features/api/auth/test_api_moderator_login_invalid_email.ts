import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test moderator login with invalid (non-existent) email address.
 *
 * This test validates the security behavior of the moderator authentication
 * system when a login attempt is made using an email address that does not
 * exist in the database. The system should reject the login attempt without
 * revealing whether the account exists, preventing account enumeration
 * attacks.
 *
 * Test Flow:
 *
 * 1. Generate a random email address that doesn't correspond to any existing
 *    moderator
 * 2. Create login credentials with the non-existent email and a password
 * 3. Attempt to authenticate using the invalid credentials
 * 4. Verify that the login fails with an appropriate error
 * 5. Ensure no authentication tokens are issued
 */
export async function test_api_moderator_login_invalid_email(
  connection: api.IConnection,
) {
  // Generate login credentials with a non-existent email address
  const invalidLoginData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "somePassword123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ILogin;

  // Attempt login with invalid credentials - should fail
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: invalidLoginData,
      });
    },
  );
}
