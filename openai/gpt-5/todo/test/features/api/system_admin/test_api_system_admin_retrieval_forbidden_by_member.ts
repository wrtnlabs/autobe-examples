import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Verify that a todoMember cannot access the System Admin retrieval endpoint.
 *
 * Business goal:
 *
 * - Ensure role-based access control (RBAC) denies a regular member from fetching
 *   system admin records.
 * - The call must fail without revealing resource existence.
 *
 * Steps:
 *
 * 1. Register (join) as a todoMember to obtain an authenticated context.
 * 2. Attempt to GET /todoList/systemAdmin/systemAdmins/{systemAdminId} using a
 *    valid UUID (random is fine) with the member token.
 * 3. Assert that the API call throws an error (deny access). Do not check specific
 *    HTTP status codes per guidelines.
 */
export async function test_api_system_admin_retrieval_forbidden_by_member(
  connection: api.IConnection,
) {
  // 1) Register a todoMember and obtain token (SDK auto-attaches Authorization)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
  } satisfies ITodoListTodoMemberJoin.ICreate;

  const member = await api.functional.auth.todoMember.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(member);

  // 2) Attempt forbidden admin retrieval with a valid UUID
  const targetAdminId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "member cannot access system admin retrieval endpoint",
    async () => {
      await api.functional.todoList.systemAdmin.systemAdmins.at(connection, {
        systemAdminId: targetAdminId,
      });
    },
  );
}
