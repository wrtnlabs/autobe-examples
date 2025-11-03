import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodouser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouser";

/**
 * Validate permanent deletion of a todo item by its owner.
 *
 * This test verifies that a todo user can create and irreversibly hard-delete
 * their own todo. The process includes:
 *
 * 1. Register a new todo user (join)
 * 2. Authenticate - connection token is automatically managed by SDK
 * 3. Create a todo with valid data
 * 4. Delete the todo via hard-delete endpoint
 * 5. Attempt to delete the same todo again (expect error)
 * 6. (Optional: If endpoint to fetch a single todo exists, try to refetch -
 *    omitted, as no such endpoint is present)
 *
 * The test expects the following validations:
 *
 * - Deletion by owner succeeds (no error is thrown)
 * - Re-deleting the same todo results in a business rule error
 */
export async function test_api_todo_permanent_deletion_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new todo user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://www.test-callback.com/register/", // test URI, must comply with uri format
    referrer: "https://www.example.com/landing", // test URI
  } satisfies ITodoListTodouser.IVerifyJoin;
  const user: ITodoListTodouser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. Create a todo
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo =
    await api.functional.todoList.todoUser.todos.create(connection, {
      body: todoBody,
    });
  typia.assert(todo);
  TestValidator.equals(
    "owner is the creator",
    todo.todo_list_todouser_id,
    user.id,
  );
  TestValidator.equals("todo title matches", todo.title, todoBody.title);
  TestValidator.equals(
    "todo is not completed on creation",
    todo.is_completed,
    false,
  );

  // 3. Delete the todo (first time)
  await api.functional.todoList.todoUser.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Attempt to delete again (should fail)
  await TestValidator.error(
    "repeating hard delete should throw not found or business error",
    async () => {
      await api.functional.todoList.todoUser.todos.erase(connection, {
        todoId: todo.id,
      });
    },
  );
}
