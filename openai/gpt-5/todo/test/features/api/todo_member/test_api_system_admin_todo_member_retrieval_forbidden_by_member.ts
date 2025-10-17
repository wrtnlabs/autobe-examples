import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Verify that a regular todoMember cannot access the admin-only member
 * retrieval API.
 *
 * Steps:
 *
 * 1. Join as a todoMember to obtain authenticated context (SDK manages token
 *    automatically).
 * 2. Call admin-only GET /todoList/systemAdmin/todoMembers/{todoMemberId} with the
 *    member’s own id → expect error.
 * 3. Call the same admin-only endpoint with a random valid UUID → expect error.
 *
 * Notes:
 *
 * - Do not assert specific HTTP status codes, only that an error occurs.
 * - Do not touch connection.headers; authentication is handled by the SDK.
 */
export async function test_api_system_admin_todo_member_retrieval_forbidden_by_member(
  connection: api.IConnection,
) {
  // 1) Join as a todoMember to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `Pw_${RandomGenerator.alphaNumeric(12)}`,
  } satisfies ITodoListTodoMemberJoin.ICreate;
  const authorized = await api.functional.auth.todoMember.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoListTodoMember.IAuthorized>(authorized);

  // 2) Attempt admin-only retrieval with the member’s own id → must error (forbidden to members)
  await TestValidator.error(
    "member cannot access admin-only retrieval with own id",
    async () => {
      await api.functional.todoList.systemAdmin.todoMembers.at(connection, {
        todoMemberId: authorized.id,
      });
    },
  );

  // 3) Attempt admin-only retrieval with a random valid UUID → must error (no existence leak)
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member cannot access admin-only retrieval with random id",
    async () => {
      await api.functional.todoList.systemAdmin.todoMembers.at(connection, {
        todoMemberId: randomId,
      });
    },
  );
}
