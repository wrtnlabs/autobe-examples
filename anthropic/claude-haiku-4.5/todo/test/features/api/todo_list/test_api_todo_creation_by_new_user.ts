import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that a newly registered user can successfully create a new todo with
 * valid required and optional fields.
 *
 * 1. Register a new Todo List user with a unique email and valid password, passing
 *    all context fields.
 * 2. Confirm registration response includes user id, email, and issued
 *    authorization tokens.
 * 3. Using the authenticated context, create a new todo with a valid title (1-255
 *    chars) and an optional description (<=1000 chars).
 * 4. Confirm the creation response contains all system-managed fields (id,
 *    completed, created_at, updated_at) and the supplied title/description.
 * 5. Validate initial completed state is false and completed_at is null/undefined.
 * 6. Validate the todo fields conform to type/validation constraints.
 */
export async function test_api_todo_creation_by_new_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    href: "https://app.todo.example.com/join",
    referrer: "https://app.todo.example.com/login",
    ip: null,
  } satisfies ITodoListUser.IJoin;
  const registered: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(registered);
  TestValidator.equals(
    "registration email matches input",
    registered.email,
    email,
  );

  // 2. Auth token is automatically applied to the connection for subsequent requests

  // 3. Create a new todo
  const todoTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const todoDescription = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 12,
  });
  const todoCreate = {
    title: todoTitle,
    description: todoDescription,
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoCreate },
  );
  typia.assert(todo);
  // 4. Confirm response contains all necessary fields
  TestValidator.predicate(
    "todo id is defined",
    typeof todo.id === "string" && todo.id.length > 0,
  );
  TestValidator.equals("todo title matches input", todo.title, todoTitle);
  TestValidator.equals(
    "todo description matches input",
    todo.description,
    todoDescription,
  );
  TestValidator.equals(
    "todo is initially not completed",
    todo.completed,
    false,
  );
  TestValidator.equals(
    "todo completed_at is null or undefined",
    todo.completed_at,
    null,
  );
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof todo.created_at === "string" && todo.created_at.length >= 20,
  );
  TestValidator.predicate(
    "updated_at is ISO date-time string",
    typeof todo.updated_at === "string" && todo.updated_at.length >= 20,
  );
}
