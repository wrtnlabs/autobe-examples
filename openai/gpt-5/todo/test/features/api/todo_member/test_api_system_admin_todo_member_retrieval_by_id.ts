import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemAdmin";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * System Admin retrieves a Todo Member by UUID.
 *
 * Flow:
 *
 * 1. Join as a System Admin (admin session established)
 * 2. Join as a Todo Member to create a target member (switches token to member)
 * 3. Join as a System Admin again to restore admin token context
 * 4. GET the Todo Member by id and validate identity and timestamps
 * 5. Attempt retrieval with a random non-existent UUID and expect an error
 * 6. Create another member, switch back to admin, and GET to verify identity
 * 7. Switch to member session and verify admin-only endpoint is rejected
 *
 * Notes:
 *
 * - Authentication tokens are automatically managed by the SDK. To switch roles,
 *   use the appropriate join endpoints. Do not touch connection.headers.
 * - Use typia.assert for type validation and TestValidator for business logic
 *   checks.
 */
export async function test_api_system_admin_todo_member_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1) Join as System Admin (admin session)
  const adminJoinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListSystemAdmin.ICreate;
  const adminAuth1 = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody1,
  });
  typia.assert(adminAuth1);

  // 2) Join as Todo Member (creates member and switches token to member)
  const memberJoinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListTodoMemberJoin.ICreate;
  const memberAuth1 = await api.functional.auth.todoMember.join(connection, {
    body: memberJoinBody1,
  });
  typia.assert(memberAuth1);

  // 3) Switch back to admin by joining another admin
  const adminJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListSystemAdmin.ICreate;
  const adminAuth2 = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody2,
  });
  typia.assert(adminAuth2);

  // 4) Retrieve the created member by id
  const fetched1 = await api.functional.todoList.systemAdmin.todoMembers.at(
    connection,
    { todoMemberId: memberAuth1.id },
  );
  typia.assert(fetched1);
  TestValidator.equals(
    "returned member id matches joined member id",
    fetched1.id,
    memberAuth1.id,
  );
  TestValidator.equals(
    "returned member email matches joined member email",
    fetched1.email,
    memberAuth1.email,
  );
  TestValidator.equals(
    "created_at is stable across join and fetch",
    fetched1.created_at,
    memberAuth1.created_at,
  );
  TestValidator.equals(
    "updated_at is stable across join and fetch",
    fetched1.updated_at,
    memberAuth1.updated_at,
  );

  // 5) Non-existent member retrieval should error
  let nonexistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentId === memberAuth1.id) {
    nonexistentId = typia.random<string & tags.Format<"uuid">>();
  }
  await TestValidator.error(
    "retrieving non-existent todo member should fail",
    async () => {
      await api.functional.todoList.systemAdmin.todoMembers.at(connection, {
        todoMemberId: nonexistentId,
      });
    },
  );

  // 6) Create another member and verify retrieval with admin context
  const memberJoinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListTodoMemberJoin.ICreate;
  const memberAuth2 = await api.functional.auth.todoMember.join(connection, {
    body: memberJoinBody2,
  });
  typia.assert(memberAuth2);

  // Switch back to admin again
  const adminJoinBody3 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListSystemAdmin.ICreate;
  const adminAuth3 = await api.functional.auth.systemAdmin.join(connection, {
    body: adminJoinBody3,
  });
  typia.assert(adminAuth3);

  const fetched2 = await api.functional.todoList.systemAdmin.todoMembers.at(
    connection,
    { todoMemberId: memberAuth2.id },
  );
  typia.assert(fetched2);
  TestValidator.equals(
    "returned member2 id matches joined member2 id",
    fetched2.id,
    memberAuth2.id,
  );

  // 7) Authorization enforcement: switch to a member and expect error on admin-only endpoint
  const memberJoinBody3 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListTodoMemberJoin.ICreate;
  const memberAuth3 = await api.functional.auth.todoMember.join(connection, {
    body: memberJoinBody3,
  });
  typia.assert(memberAuth3);

  await TestValidator.error(
    "member role should not be authorized to retrieve arbitrary member by id",
    async () => {
      await api.functional.todoList.systemAdmin.todoMembers.at(connection, {
        todoMemberId: memberAuth1.id,
      });
    },
  );
}
