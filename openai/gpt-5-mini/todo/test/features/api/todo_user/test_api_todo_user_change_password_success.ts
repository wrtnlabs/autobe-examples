import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todo_user_change_password_success(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Create a new todoUser via POST /auth/todoUser/join (IAuthorize payload)
   * 2. Change the user's password with PUT /auth/todoUser/password
   * 3. Verify business outcomes: id unchanged, updatedAt advanced
   * 4. Verify old password is rejected after the change (negative case)
   */

  // 1) Create a new todoUser via join
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const initialPassword: string = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    email: userEmail,
    password: initialPassword,
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Keep a snapshot of updatedAt from join for later comparison
  const prevUpdatedAt = authorized.updatedAt;

  // 2) Change password (authenticated via connection header set by join)
  const newPassword: string = RandomGenerator.alphaNumeric(12);
  const changeBody = {
    currentPassword: initialPassword,
    newPassword,
  } satisfies ITodoAppTodoUser.IChangePassword;

  const summary: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.password.changePassword(connection, {
      body: changeBody,
    });
  typia.assert(summary);

  // 3) Business validations
  TestValidator.equals(
    "user id unchanged after password change",
    summary.id,
    authorized.id,
  );
  TestValidator.predicate(
    "updatedAt advanced after password change",
    new Date(summary.updatedAt) > new Date(prevUpdatedAt),
  );

  // 4) Negative verification: old password should be rejected now
  await TestValidator.error("old password rejected after change", async () => {
    await api.functional.auth.todoUser.password.changePassword(connection, {
      body: {
        currentPassword: initialPassword,
        newPassword: RandomGenerator.alphaNumeric(12),
      } satisfies ITodoAppTodoUser.IChangePassword,
    });
  });
}
