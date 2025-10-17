import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberDeactivate } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberDeactivate";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";
import type { ITodoListTodoMemberLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberLogin";

export async function test_api_todo_member_login_rejected_when_deactivated(
  connection: api.IConnection,
) {
  /**
   * Validate that a deactivated member cannot authenticate again.
   *
   * Steps:
   *
   * 1. Register a new member (join) and obtain authenticated context (SDK sets
   *    Authorization).
   * 2. Deactivate the member account while authenticated.
   * 3. Attempt to login with the same email/password and expect an authentication
   *    failure.
   */

  // --- 1) Join: create and authenticate a new member ---
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(12); // >= 8 chars

  const authorized = await api.functional.auth.todoMember.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListTodoMemberJoin.ICreate,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(authorized);

  // --- 2) Deactivate the authenticated member ---
  const security = await api.functional.auth.todoMember.deactivate(connection, {
    body: {
      reason: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies ITodoListTodoMemberDeactivate.ICreate,
  });
  typia.assert<ITodoListTodoMember.ISecurity>(security);
  TestValidator.predicate(
    "deactivation should report success",
    security.success === true,
  );

  // --- 3) Attempt to login again after deactivation: expect failure ---
  // Use unauthenticated connection clone (allowed pattern) - do not manipulate headers afterwards
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "deactivated member must not be able to login",
    async () => {
      await api.functional.auth.todoMember.login(unauthConn, {
        body: {
          email,
          password,
        } satisfies ITodoListTodoMemberLogin.ICreate,
      });
    },
  );
}
