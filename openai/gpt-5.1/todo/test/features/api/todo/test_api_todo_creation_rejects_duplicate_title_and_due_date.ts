import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test that the API rejects attempts to create a duplicate todo (same title and
 * due_date) for the same user.
 *
 * 1. Register (join) a new user for the todo list system and ensure authentication
 *    context is properly established.
 * 2. As the authenticated user, create a todo using a specific (random) title and
 *    due_date combination.
 * 3. Attempt to create a second todo for the same user with an identical title and
 *    due_date.
 * 4. Verify that the API rejects the second creation attempt according to unique
 *    constraint enforcement, by ensuring an error is thrown.
 */
export async function test_api_todo_creation_rejects_duplicate_title_and_due_date(
  connection: api.IConnection,
) {
  // 1. Register a new user (authentication context setup)
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const joinInput = {
    email,
    password,
    href: "https://test.example.com/register",
    referrer: "https://test.example.com/landing",
  } satisfies ITodoListUser.IJoin;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: joinInput,
  });
  typia.assert(userAuth);

  // 2. As authenticated user, create first todo
  const title = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 12,
  });
  const dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // tomorrow
  const todoInput = {
    title,
    due_date: dueDate,
  } satisfies ITodoListTodo.ICreate;
  const firstTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoInput },
  );
  typia.assert(firstTodo);
  TestValidator.equals("todo title matches input", firstTodo.title, title);
  TestValidator.equals(
    "todo due_date matches input",
    firstTodo.due_date,
    dueDate,
  );

  // 3 & 4. Attempt duplicate todo creation, expect rejection
  await TestValidator.error(
    "API must reject duplicate todo with same title and due_date",
    async () => {
      await api.functional.todoList.user.todos.create(connection, {
        body: todoInput,
      });
    },
  );
}
