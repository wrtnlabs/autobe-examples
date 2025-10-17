import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Delete a Todo and confirm absence via idempotent deletion.
 *
 * This test exercises the happy-path lifecycle needed to delete a Todo owned by
 * the authenticated todoMember. As the accessible API surface includes only
 * join (authentication), create, and erase (delete) operations, post-deletion
 * verification is performed by calling erase again and expecting no error
 * (idempotent semantics), which implies the resource is absent or
 * inaccessible.
 *
 * Steps:
 *
 * 1. Join as a new todoMember (SDK stores tokens automatically in connection)
 * 2. Create a Todo and validate default fields and timestamps
 * 3. Delete the Todo by id
 * 4. Call delete again for the same id to verify idempotency (no error)
 */
export async function test_api_todo_delete_and_verify_absence(
  connection: api.IConnection,
) {
  // 1) Authenticate (join) as a new todoMember
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ITodoListTodoMemberJoin.ICreate;
  const authorized = await api.functional.auth.todoMember.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a Todo
  const rawTitle: string = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  // Ensure single-line, length <= 100, no newlines per DTO constraints
  const trimmedTitle = rawTitle.replace(/\r?\n/g, " ").slice(0, 100).trim();
  const safeTitle =
    trimmedTitle.length > 0
      ? trimmedTitle
      : `todo ${RandomGenerator.alphabets(8)}`;

  const createBody = {
    title: safeTitle,
  } satisfies ITodoListTodo.ICreate;

  const created = await api.functional.todoList.todos.create(connection, {
    body: createBody,
  });
  typia.assert(created);

  // Validate echoed title
  TestValidator.equals(
    "created todo title equals input title",
    created.title,
    safeTitle,
  );
  // Validate default completion state
  TestValidator.equals(
    "isCompleted defaults to false on create",
    created.isCompleted,
    false,
  );
  // Validate updatedAt >= createdAt
  const createdAtMs = Date.parse(created.createdAt);
  const updatedAtMs = Date.parse(created.updatedAt);
  TestValidator.predicate(
    "updatedAt must not be before createdAt on creation",
    updatedAtMs >= createdAtMs,
  );

  // 3) Delete the Todo by id
  await api.functional.todoList.todoMember.todos.erase(connection, {
    todoId: created.id,
  });

  // 4) Verify absence via idempotent deletion (second delete should not throw)
  await api.functional.todoList.todoMember.todos.erase(connection, {
    todoId: created.id,
  });
}
