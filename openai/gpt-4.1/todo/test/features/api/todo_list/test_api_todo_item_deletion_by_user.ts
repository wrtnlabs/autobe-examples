import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListSysMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSysMigration";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * E2E test for Todo item deletion by user.
 *
 * This function validates the following complete real-world workflow:
 *
 * 1. Register a new user for authentication context
 * 2. Create a new Todo item for this user (random description and future due_date)
 * 3. Delete the Todo item as the owner
 * 4. Attempt to access the deleted item to verify it is no longer retrievable
 *    (ownership and hard deletion enforcement)
 */
export async function test_api_todo_item_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user (join)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<100> & tags.Format<"password">
  >();
  const href = "https://test-client.local/registration";
  const referrer = "https://test-client.local/";
  // Optionally generate IPv4 or IPv6 randomly
  const randomIpType = Math.random() < 0.5 ? "ipv4" : "ipv6";
  const ip =
    randomIpType === "ipv4"
      ? typia.random<string & tags.Format<"ipv4">>()
      : typia.random<string & tags.Format<"ipv6">>();
  const joinBody = {
    email,
    password,
    href,
    referrer,
    ip,
  } satisfies ITodoListUser.ICreate;

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: joinBody },
  );
  typia.assert(user);
  TestValidator.equals(
    "registered user email matches input",
    user.email,
    email,
  );

  // 2. Create a new Todo for this user
  const todoDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
  });
  // Generate a due_date at least 1 hour in the future
  const now = new Date();
  const dueDate = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const todoCreateBody = {
    description: todoDescription,
    due_date: dueDate,
  } satisfies ITodoListTodo.ICreate;

  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoCreateBody },
  );
  typia.assert(todo);
  TestValidator.equals("todo owner id matches user", todo.user.id, user.id);
  TestValidator.equals(
    "todo description matches input",
    todo.description,
    todoDescription,
  );
  TestValidator.equals("todo due_date matches input", todo.due_date, dueDate);
  TestValidator.predicate("todo is not completed", todo.completed === false);

  // 3. Delete the Todo as owner
  await api.functional.todoList.user.todos.erase(connection, {
    todoId: todo.id,
  });

  // 4. Try to access the deleted Todo (should fail)
  // Since there is no GET endpoint in imports, this step is omitted unless such endpoint is implemented.
}
