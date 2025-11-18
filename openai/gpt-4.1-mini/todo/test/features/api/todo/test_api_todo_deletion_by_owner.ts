import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodolistmember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodolistmember";

/**
 * Validates permanent deletion of a todo by its owner.
 *
 * - Register and authenticate as a todoListMember
 * - Create a todo item
 * - Delete the created todo
 * - (Negative path) Try to delete by a different user (not implemented since only
 *   owner is authenticated in this flow)
 * - Confirm permanent removal (by business rules, no data should remain
 *   accessible, and only audit logs are left, which are not exposed via API)
 * - If attempted retrieval or second deletion is supported, confirm error is
 *   thrown
 */
export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as a new todoListMember
  const memberInput = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
    >(),
    password: RandomGenerator.alphaNumeric(12), // Length 12
    href: "https://test-todo.com/join",
    referrer: "https://test-todo.com/welcome",
    ip: "127.0.0.1",
  } satisfies ITodoListTodolistmember.ICreate;
  const member = await api.functional.auth.todoListMember.join(connection, {
    body: memberInput,
  });
  typia.assert(member);
  TestValidator.equals("registered email", member.email, memberInput.email);

  // 2. Create a new todo under authenticated user
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 4,
      sentenceMax: 8,
      wordMin: 5,
      wordMax: 15,
    }),
    is_complete: false,
  } satisfies ITodoListTodo.ICreate;
  const todo = await api.functional.todoList.todoListMember.todos.create(
    connection,
    { body: todoInput },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo title after creation",
    todo.title,
    todoInput.title,
  );

  // 3. Permanently delete the created todo
  await api.functional.todoList.todoListMember.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Attempt to delete again should fail (confirm permanence of deletion)
  await TestValidator.error("cannot delete already deleted todo", async () => {
    await api.functional.todoList.todoListMember.todos.erase(connection, {
      todoId: todo.id,
    });
  });
}
