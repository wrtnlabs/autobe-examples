import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMember";
import type { ITodoListTodoMemberJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoMemberJoin";

/**
 * Idempotent completion: updating a Todo to the same state twice should not
 * mutate timestamps.
 *
 * Steps:
 *
 * 1. Join as a fresh todoMember (SDK manages token automatically).
 * 2. Create a Todo and capture id, title, createdAt, updatedAt.
 * 3. First update: set is_completed to true.
 *
 *    - Assert: id unchanged, title unchanged, isCompleted true, createdAt unchanged,
 *         updatedAt non-decreasing, completedAt present.
 * 4. Second update (no-op): set is_completed to true again with no title change.
 *
 *    - Assert: id unchanged, title unchanged, isCompleted true, createdAt unchanged,
 *         updatedAt unchanged (no-op), completedAt unchanged.
 */
export async function test_api_todo_update_idempotent_completion_no_op(
  connection: api.IConnection,
) {
  // 1) Authenticate as a new todoMember via join
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.todoMember.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListTodoMemberJoin.ICreate,
  });
  typia.assert(member);

  // 2) Create a Todo; capture id and timestamps
  const title = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const created = await api.functional.todoList.todos.create(connection, {
    body: {
      title,
    } satisfies ITodoListTodo.ICreate,
  });
  typia.assert(created);

  TestValidator.equals(
    "created: default isCompleted is false",
    created.isCompleted,
    false,
  );
  const todoId = created.id;
  const createdAt1 = created.createdAt;
  const updatedAt1 = created.updatedAt;

  // 3) First update: set is_completed to true
  const updated1 = await api.functional.todoList.todos.update(connection, {
    todoId,
    body: {
      is_completed: true,
    } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(updated1);

  // Invariants after meaningful update
  TestValidator.equals("first update: id unchanged", updated1.id, todoId);
  TestValidator.equals("first update: title unchanged", updated1.title, title);
  TestValidator.equals(
    "first update: createdAt unchanged",
    updated1.createdAt,
    createdAt1,
  );
  TestValidator.predicate(
    "first update: updatedAt is not earlier than previous",
    new Date(updated1.updatedAt).getTime() >= new Date(updatedAt1).getTime(),
  );
  TestValidator.equals(
    "first update: isCompleted true",
    updated1.isCompleted,
    true,
  );
  TestValidator.predicate(
    "first update: completedAt present when completed",
    updated1.completedAt !== null && updated1.completedAt !== undefined,
  );

  // 4) Second update: no-op with identical state
  const updated2 = await api.functional.todoList.todos.update(connection, {
    todoId,
    body: {
      is_completed: true,
    } satisfies ITodoListTodo.IUpdate,
  });
  typia.assert(updated2);

  // No-op invariants
  TestValidator.equals("second update: id unchanged", updated2.id, todoId);
  TestValidator.equals("second update: title unchanged", updated2.title, title);
  TestValidator.equals(
    "second update: createdAt unchanged",
    updated2.createdAt,
    createdAt1,
  );
  TestValidator.equals(
    "second update: updatedAt unchanged on no-op",
    updated2.updatedAt,
    updated1.updatedAt,
  );
  TestValidator.equals(
    "second update: isCompleted still true",
    updated2.isCompleted,
    true,
  );
  TestValidator.equals(
    "second update: completedAt unchanged",
    updated2.completedAt,
    updated1.completedAt,
  );
}
