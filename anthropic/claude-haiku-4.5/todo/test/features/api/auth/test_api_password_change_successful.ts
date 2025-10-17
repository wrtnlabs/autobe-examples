import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

export async function test_api_password_change_successful(
  connection: api.IConnection,
) {
  // Step 1: Register a new authenticated user with initial password
  const initialEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123!"; // Valid password: 8+ chars, uppercase, lowercase, digit, special char

  const registered = await api.functional.auth.authenticatedUser.join(
    connection,
    {
      body: {
        email: initialEmail,
        password: initialPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    },
  );
  typia.assert(registered);

  TestValidator.predicate(
    "user registered with valid ID",
    registered.id !== null && registered.id !== undefined,
  );

  // Step 2: Verify initial authentication token is present
  const initialToken = registered.token;
  typia.assert(initialToken);

  // Step 3: Request password change with valid new password
  const newPassword = "ChangedPass456@"; // Valid password: meets all requirements

  const changePasswordResponse =
    await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
      connection,
      {
        body: {
          current_password: initialPassword,
          new_password: newPassword,
          new_password_confirm: newPassword,
        } satisfies ITodoAppAuth.IChangePasswordRequest,
      },
    );
  typia.assert(changePasswordResponse);

  TestValidator.predicate(
    "password change response contains success message",
    changePasswordResponse.message !== null &&
      changePasswordResponse.message !== undefined,
  );

  // Step 4: Test attempting password change with incorrect current password
  const wrongCurrentPassword = "WrongPassword1@";

  await TestValidator.error(
    "password change fails with incorrect current password",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: wrongCurrentPassword,
            new_password: "AnotherPass789@",
            new_password_confirm: "AnotherPass789@",
          } satisfies ITodoAppAuth.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 5: Test password change with mismatched confirmation
  await TestValidator.error(
    "password change fails when new_password and new_password_confirm do not match",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: initialPassword,
            new_password: "ValidPass123@",
            new_password_confirm: "DifferentPass456@",
          } satisfies ITodoAppAuth.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 6: Test password change with new password that's too short (below 8 chars)
  await TestValidator.error(
    "password change fails with new password shorter than 8 characters",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: initialPassword,
            new_password: "Short1@",
            new_password_confirm: "Short1@",
          } satisfies ITodoAppAuth.IChangePasswordRequest,
        },
      );
    },
  );
}
