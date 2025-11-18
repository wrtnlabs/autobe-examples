import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate retrieval of a specific todo item's details owned by the
 * authenticated user.
 *
 * This test covers multiple cases:
 *
 * 1. A user can successfully retrieve their own todo by its id, and the returned
 *    object fields (id, title, description, status, timestamps) match database
 *    state.
 * 2. Access to another user's todo by id must be forbidden and results in proper
 *    error handling.
 * 3. If a non-existent todo id is requested, the API must return an error.
 *
 * Steps:
 *
 * 1. Register user1 and authenticate.
 * 2. Create a todo as user1 and fetch it by id, verify all details.
 * 3. Register user2, authenticate, and attempt to fetch user1's todo by id (should
 *    fail).
 * 4. As user1, try to fetch a random non-existent todo id (should fail).
 */
export async function test_api_todo_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register user1
  const user1Join = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "1A",
    display_name: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://referrer.com/login",
  } satisfies ITodoListUser.IJoin;
  const user1: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: user1Join },
  );
  typia.assert(user1);

  // 2. Create a todo as user1
  const todoBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoBody },
  );
  typia.assert(todo);

  // 3. Fetch the todo by id as owner
  const fetched: ITodoListTodo = await api.functional.todoList.user.todos.at(
    connection,
    { todoId: todo.id },
  );
  typia.assert(fetched);
  TestValidator.equals("fetched todo id matches created", fetched.id, todo.id);
  TestValidator.equals("fetched todo title matches", fetched.title, todo.title);
  TestValidator.equals(
    "fetched todo description matches",
    fetched.description,
    todo.description,
  );
  TestValidator.equals(
    "fetched todo status matches",
    fetched.status,
    todo.status,
  );
  TestValidator.equals(
    "fetched created_at present",
    typeof fetched.created_at,
    "string",
  );
  TestValidator.equals(
    "fetched updated_at present",
    typeof fetched.updated_at,
    "string",
  );

  // 4. Register user2
  const user2Join = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "!bC",
    display_name: RandomGenerator.name(),
    href: "https://example.com/signup",
    referrer: "https://referrer.com/login",
  } satisfies ITodoListUser.IJoin;
  // Switch to new user session
  await api.functional.auth.user.join(connection, { body: user2Join });
  // 5. Try to fetch user1's todo by id as user2 (should error)
  await TestValidator.error("user2 cannot access user1's todo", async () => {
    await api.functional.todoList.user.todos.at(connection, {
      todoId: todo.id,
    });
  });

  // 6. Switch back to user1
  await api.functional.auth.user.join(connection, { body: user1Join });
  // 7. Try to fetch a non-existent todo id as user1 (should error)
  const randomTodoId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;
  await TestValidator.error(
    "user1 cannot access non-existent todo",
    async () => {
      await api.functional.todoList.user.todos.at(connection, {
        todoId: randomTodoId,
      });
    },
  );
}
