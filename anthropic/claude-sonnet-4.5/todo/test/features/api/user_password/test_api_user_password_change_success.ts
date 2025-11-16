import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful password change workflow for authenticated user.
 *
 * This test validates the complete password change flow:
 *
 * 1. Create a new user account via join operation
 * 2. User is automatically authenticated after registration
 * 3. Change password using current password and new password
 * 4. Verify success response with confirmation message
 *
 * The test ensures that authenticated users can successfully change their
 * password by providing valid current password and meeting new password
 * requirements.
 */
export async function test_api_user_password_change_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authenticated user context
  const currentPassword = "SecurePassword123!";
  const userEmail = typia.random<string & tags.Format<"email">>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: currentPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });

  typia.assert(registeredUser);

  // Step 2: Change the password using current password
  const newPassword = "NewSecurePassword456!";

  const changePasswordResult =
    await api.functional.auth.user.password.change.changePassword(connection, {
      body: {
        current_password: currentPassword,
        new_password: newPassword,
      } satisfies ITodoListUser.IChangePassword,
    });

  typia.assert(changePasswordResult);

  // Step 3: Validate successful password change
  TestValidator.equals(
    "password change should succeed",
    changePasswordResult.success,
    true,
  );

  TestValidator.predicate(
    "success message should be present",
    changePasswordResult.message.length > 0,
  );
}
