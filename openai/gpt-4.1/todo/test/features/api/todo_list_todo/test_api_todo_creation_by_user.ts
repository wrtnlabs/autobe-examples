import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test successful creation of a new Todo item by an authenticated user.
 *
 * 1. Register a new user via the join API.
 * 2. Ensure the returned user object contains a valid UUID and auth token.
 * 3. Prepare a Todo creation payload with valid title and (optional) description.
 * 4. Call the Todo creation endpoint as the authenticated user.
 * 5. Assert the Todo is attributed to the right user, is incomplete by default,
 *    and has required timestamps. Accept either null or undefined as correct
 *    for 'completed_at'.
 */
export async function test_api_todo_creation_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const registration = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(registration);

  // 2. Prepare Todo creation request
  const createTodoPayload = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
  } satisfies ITodoListTodo.ICreate;

  // 3. Create the Todo
  const todo = await api.functional.todoList.user.todos.create(connection, {
    body: createTodoPayload,
  });
  typia.assert(todo);

  // 4. Validate Todo business correctness
  TestValidator.equals(
    "todo is attributed to correct user",
    todo.todo_list_user_id,
    registration.id,
  );
  TestValidator.equals(
    "default completion state is false",
    todo.completed,
    false,
  );
  TestValidator.predicate(
    "todo title matches payload",
    todo.title === createTodoPayload.title,
  );
  TestValidator.predicate(
    "todo description matches",
    todo.description === createTodoPayload.description,
  );
  TestValidator.predicate(
    "completed_at should be null or undefined, as task is incomplete",
    todo.completed_at === null || todo.completed_at === undefined,
  );
}
