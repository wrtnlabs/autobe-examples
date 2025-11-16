import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test password change rejection when new password does not meet security
 * requirements.
 *
 * This test validates that the password change endpoint properly enforces
 * password security policies by rejecting weak passwords. The test creates a
 * new user account, then attempts to change the password using the correct
 * current password but providing a weak new password that fails to meet minimum
 * security criteria (such as minimum length of 8 characters or character
 * diversity requirements).
 *
 * The test ensures that:
 *
 * 1. User registration succeeds with valid credentials
 * 2. Password change with weak new password is rejected with validation error
 * 3. The endpoint enforces password strength requirements
 *
 * Steps:
 *
 * 1. Create a new user account via join operation
 * 2. Attempt to change password with correct current password but weak new
 *    password
 * 3. Verify that the operation throws an error due to weak password validation
 */
export async function test_api_user_password_change_weak_new_password(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with valid credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "ValidPass123!"; // Strong password for initial registration
  const weakPassword = "weak"; // Weak password that should fail validation (less than 8 characters)

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: validPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(registeredUser);

  // Step 2: Attempt to change password with correct current password but weak new password
  // This should fail due to password strength requirements
  await TestValidator.error(
    "password change should fail with weak new password",
    async () => {
      await api.functional.auth.user.password.change.changePassword(
        connection,
        {
          body: {
            current_password: validPassword,
            new_password: weakPassword,
          } satisfies ITodoListUser.IChangePassword,
        },
      );
    },
  );
}
