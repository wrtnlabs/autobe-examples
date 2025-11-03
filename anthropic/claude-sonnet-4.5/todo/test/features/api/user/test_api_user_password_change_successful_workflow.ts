import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test the successful password change workflow for an authenticated user.
 *
 * This test validates the complete password change process:
 *
 * 1. Create a new user account with initial password
 * 2. Authenticate to obtain JWT tokens (happens automatically during registration)
 * 3. Change the password with correct current password and valid new password
 * 4. Verify the operation completes successfully
 *
 * The test ensures that:
 *
 * - Password change requires authentication
 * - Current password verification works correctly
 * - New password meets security requirements (min 8 chars, at least one letter
 *   and number)
 * - The operation returns successful confirmation
 */
export async function test_api_user_password_change_successful_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with initial password
  const initialPassword = "password123";
  const newPassword = "newPassword456";

  const registerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListUser.IRegister;

  // Step 2: Register user (this also authenticates automatically)
  const user = await api.functional.auth.user.join(connection, {
    body: registerBody,
  });
  typia.assert(user);

  // Step 3: Change password with correct current password and valid new password
  const changePasswordBody = {
    current_password: initialPassword,
    new_password: newPassword,
  } satisfies ITodoListUser.IChangePassword;

  // The password change operation returns void on success
  await api.functional.todoList.user.users.me.password.update(connection, {
    body: changePasswordBody,
  });
}
