import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberDeactivate } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberDeactivate";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberPassword";

/**
 * Deny password rotation for deactivated todoMember accounts.
 *
 * Workflow:
 *
 * 1. Register a new member (join) which issues JWT tokens and authenticates the
 *    connection.
 * 2. Deactivate the member account.
 * 3. Attempt to change password with the previously issued token.
 * 4. Expect the operation to be rejected (error thrown), without asserting
 *    specific status codes.
 *
 * Rules:
 *
 * - Use proper DTO variants with `satisfies` for request bodies.
 * - Validate non-error responses using typia.assert().
 * - Do not manipulate connection.headers; SDK manages tokens automatically.
 */
export async function test_api_todo_member_password_change_denied_when_deactivated(
  connection: api.IConnection,
) {
  // 1) Register a new member and authenticate connection via SDK
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const plainPassword: string = RandomGenerator.alphaNumeric(12);

  const authorized = await api.functional.auth.todoMember.join(connection, {
    body: {
      email,
      password: plainPassword,
    } satisfies ITodoListTodoMemberJoin.ICreate,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(authorized);

  // 2) Deactivate the account
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const deactivated = await api.functional.auth.todoMember.deactivate(
    connection,
    {
      body: {
        reason,
      } satisfies ITodoListTodoMemberDeactivate.ICreate,
    },
  );
  typia.assert<ITodoListTodoMember.ISecurity>(deactivated);
  TestValidator.equals(
    "deactivation success flag is true",
    deactivated.success,
    true,
  );

  // 3) Attempt password change with previously issued token
  const newPassword: string = RandomGenerator.alphaNumeric(12);
  await TestValidator.error(
    "deactivated member cannot change password",
    async () => {
      await api.functional.auth.todoMember.password.changePassword(connection, {
        body: {
          current_password: plainPassword,
          new_password: newPassword,
        } satisfies ITodoListTodoMemberPassword.IUpdate,
      });
    },
  );
}
