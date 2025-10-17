import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

export async function test_api_password_change_weak_new_password(
  connection: api.IConnection,
) {
  // Step 1: Register a new user with a valid password
  const userEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "ValidPassword123!";

  const registeredUser: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: userEmail,
        password: validPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Test password change with weak password - too short (less than 8 characters)
  await TestValidator.error(
    "should reject password change with password too short",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: validPassword,
            new_password: "Short1!",
            new_password_confirm: "Short1!",
          } satisfies ITodoAppAuth.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 3: Test password change with weak password - missing uppercase letter
  await TestValidator.error(
    "should reject password change with password missing uppercase letter",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: validPassword,
            new_password: "weakpassword123!",
            new_password_confirm: "weakpassword123!",
          } satisfies ITodoAppAuth.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 4: Test password change with weak password - missing lowercase letter
  await TestValidator.error(
    "should reject password change with password missing lowercase letter",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: validPassword,
            new_password: "WEAKPASSWORD123!",
            new_password_confirm: "WEAKPASSWORD123!",
          } satisfies ITodoAppAuth.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 5: Test password change with weak password - missing digit
  await TestValidator.error(
    "should reject password change with password missing digit",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: validPassword,
            new_password: "WeakPassword!",
            new_password_confirm: "WeakPassword!",
          } satisfies ITodoAppAuth.IChangePasswordRequest,
        },
      );
    },
  );

  // Step 6: Test password change with weak password - missing special character
  await TestValidator.error(
    "should reject password change with password missing special character",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.change_password.changePassword(
        connection,
        {
          body: {
            current_password: validPassword,
            new_password: "WeakPassword123",
            new_password_confirm: "WeakPassword123",
          } satisfies ITodoAppAuth.IChangePasswordRequest,
        },
      );
    },
  );
}
