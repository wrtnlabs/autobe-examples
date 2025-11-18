import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful password change workflow for an authenticated user.
 *
 * This test validates the complete password update process including:
 *
 * 1. User registration and authentication
 * 2. Password change with current password verification
 * 3. New password acceptance meeting security requirements
 * 4. Success confirmation response validation
 *
 * The test ensures that users can securely update their passwords when
 * providing valid credentials and meeting complexity requirements.
 */
export async function test_api_user_password_change_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account with initial password
  const initialPassword = "InitialPass123!@#";
  const userEmail = typia.random<string & tags.Format<"email">>();

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: initialPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies ITodoListUser.ICreate,
  });

  // Step 2: Validate registration succeeded and user is authenticated
  typia.assert(registeredUser);
  TestValidator.predicate(
    "user should be authenticated after registration",
    registeredUser.token.access.length > 0,
  );

  // Step 3: Generate new password meeting security requirements
  // Must be at least 8 characters with uppercase, lowercase, digit, and special character
  const newPassword = "NewSecurePass456!@#";

  // Step 4: Change the password
  const changeResult =
    await api.functional.todoList.user.users.me.password.updatePassword(
      connection,
      {
        body: {
          current_password: initialPassword,
          new_password: newPassword,
        } satisfies ITodoListUser.IChangePassword,
      },
    );

  // Step 5: Validate the password change response
  typia.assert(changeResult);
  TestValidator.equals(
    "password change should succeed",
    changeResult.success,
    true,
  );
  TestValidator.predicate(
    "success message should be present",
    changeResult.message.length > 0,
  );
}
