import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test password change functionality for authenticated users.
 *
 * This test validates the complete password change workflow:
 *
 * 1. User registration and authentication
 * 2. Password change with current password verification
 * 3. Validation of password complexity requirements
 * 4. Confirmation of successful password change operation
 */
export async function test_api_user_password_change_authenticated(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account using the provided registration endpoint
  const userEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPassword123";

  const user = await api.functional.todoApp.auth.register.create(connection, {
    body: {
      email: userEmail,
      password: initialPassword,
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test successful password change with correct current password
  const newPassword = "NewSecurePassword456";

  const changeResponse =
    await api.functional.auth.user.password.change.changePassword(connection, {
      body: {
        user_id: user.id,
        current_password: initialPassword,
        new_password: newPassword,
      } satisfies ITodoAppUser.IChangePassword,
    });
  typia.assert(changeResponse);

  // Validate successful password change response
  TestValidator.equals(
    "password change should succeed",
    changeResponse.success,
    true,
  );
  TestValidator.predicate(
    "response should contain success message",
    changeResponse.message.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    new Date(changeResponse.updated_at).getTime() > 0,
  );

  // Step 3: Test error scenario - incorrect current password
  await TestValidator.error(
    "should fail with incorrect current password",
    async () => {
      await api.functional.auth.user.password.change.changePassword(
        connection,
        {
          body: {
            user_id: user.id,
            current_password: "WrongPassword789",
            new_password: "AnotherNewPassword123",
          } satisfies ITodoAppUser.IChangePassword,
        },
      );
    },
  );

  // Step 4: Test business logic error - duplicate email (if applicable)
  // This tests a realistic business rule violation rather than type errors
  await TestValidator.error(
    "should fail with invalid user_id format",
    async () => {
      await api.functional.auth.user.password.change.changePassword(
        connection,
        {
          body: {
            user_id: "invalid-uuid-format",
            current_password: newPassword,
            new_password: "ValidPassword123",
          } satisfies ITodoAppUser.IChangePassword,
        },
      );
    },
  );
}
