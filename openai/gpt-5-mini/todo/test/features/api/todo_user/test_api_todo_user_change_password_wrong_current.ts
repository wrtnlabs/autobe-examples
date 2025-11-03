import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate that change-password is rejected when currentPassword is incorrect.
 *
 * Scenario:
 *
 * 1. Create a new todoUser via POST /auth/todoUser/join (returns authorization and
 *    sets connection headers).
 * 2. Attempt PUT /auth/todoUser/password with an incorrect currentPassword →
 *    expect error.
 * 3. Verify original password remains valid by successfully calling PUT
 *    /auth/todoUser/password with the correct currentPassword.
 *
 * Notes:
 *
 * - Join() auto-attaches Authorization to the provided connection per SDK
 *   behavior.
 * - The test uses only the provided SDK functions (join, changePassword).
 */
export async function test_api_todo_user_change_password_wrong_current(
  connection: api.IConnection,
) {
  // 1) Prepare unique user credentials
  const originalPassword = "P@ssw0rd1"; // satisfies MinLength<8>
  const attemptedNewPassword = "AttemptedNewP@ss2";
  const finalNewPassword = "FinalNewP@ss3";

  const email = typia.random<string & tags.Format<"email">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // 2) Create (join) and authenticate the user
  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email,
        password: originalPassword,
        displayName: RandomGenerator.name(),
        href,
        referrer,
      } satisfies ITodoAppTodoUser.ICreate,
    });
  typia.assert(authorized);

  // 3) Attempt to change password with incorrect current password
  const incorrectCurrent = originalPassword + "wrong";
  await TestValidator.error(
    "change-password should fail when currentPassword is incorrect",
    async () => {
      await api.functional.auth.todoUser.password.changePassword(connection, {
        body: {
          currentPassword: incorrectCurrent,
          newPassword: attemptedNewPassword,
        } satisfies ITodoAppTodoUser.IChangePassword,
      });
    },
  );

  // 4) Confirm the original password still works by performing a valid change
  //    (use original password as currentPassword; this will succeed only if
  //    the password was not mutated by the failed attempt)
  const summary: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.password.changePassword(connection, {
      body: {
        currentPassword: originalPassword,
        newPassword: finalNewPassword,
      } satisfies ITodoAppTodoUser.IChangePassword,
    });
  typia.assert(summary);

  // 5) Business-logic assertions
  TestValidator.equals(
    "user id remains the same after successful change",
    summary.id,
    authorized.id,
  );
}
