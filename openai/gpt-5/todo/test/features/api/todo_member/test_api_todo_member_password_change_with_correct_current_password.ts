import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberPassword";

/**
 * Validate successful password rotation for an authenticated todoMember.
 *
 * Workflow overview:
 *
 * 1. Register a brand-new member via join to obtain an authenticated session (SDK
 *    manages Authorization token automatically).
 * 2. Try a password change with an incorrect current password and validate that
 *    the server rejects it (business-rule error).
 * 3. Change the password with the correct current password and a strong new
 *    password, then verify success confirmation without sensitive leakage.
 *
 * Notes:
 *
 * - Uses only provided APIs: join and password.changePassword.
 * - Uses typia.assert() to ensure response types and formats are correct.
 * - Avoids any direct header manipulation; SDK handles authentication tokens.
 */
export async function test_api_todo_member_password_change_with_correct_current_password(
  connection: api.IConnection,
) {
  // 1) Register a new member (join) to establish an authenticated session
  const initialPassword: string = `${RandomGenerator.alphaNumeric(8)}${RandomGenerator.alphaNumeric(6)}`; // >= 14 chars
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
  } satisfies ITodoListTodoMemberJoin.ICreate;

  const authorized: ITodoListTodoMember.IAuthorized =
    await api.functional.auth.todoMember.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Attempt password change with WRONG current password → expect error
  const wrongChangeBody = {
    current_password: `${initialPassword}x`, // wrong by design (length >= 8)
    new_password: `${RandomGenerator.alphaNumeric(8)}${RandomGenerator.alphaNumeric(6)}`,
  } satisfies ITodoListTodoMemberPassword.IUpdate;

  await TestValidator.error(
    "password change should fail with wrong current password",
    async () => {
      await api.functional.auth.todoMember.password.changePassword(connection, {
        body: wrongChangeBody,
      });
    },
  );

  // 3) Correct password change with the actual current password
  const newPassword: string = `${RandomGenerator.alphaNumeric(10)}${RandomGenerator.alphaNumeric(6)}`; // >= 16 chars
  const correctChangeBody = {
    current_password: initialPassword,
    new_password: newPassword,
  } satisfies ITodoListTodoMemberPassword.IUpdate;

  const security: ITodoListTodoMember.ISecurity =
    await api.functional.auth.todoMember.password.changePassword(connection, {
      body: correctChangeBody,
    });
  typia.assert(security);

  // Business confirmation: operation succeeded
  TestValidator.equals(
    "password change finished successfully",
    security.success,
    true,
  );
}
