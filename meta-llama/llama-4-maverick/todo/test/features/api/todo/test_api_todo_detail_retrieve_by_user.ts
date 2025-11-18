import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

/**
 * Validate detail retrieval of todo item by user.
 *
 * This test ensures that an authenticated user can retrieve details of a
 * specific todo item by ID. The process verifies user ownership and full data
 * visibility for private items.
 *
 * 1. Register a new user (obtain authentication)
 * 2. Create a todo as this user (with all fields populated)
 * 3. Retrieve the created todo by ID
 * 4. Assert that the retrieved todo's fields match the creation data exactly
 */
export async function test_api_todo_detail_retrieve_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test-client.app/join",
    referrer: "https://test-client.app/landing",
    ip: null,
  } satisfies ITodoUser.ICreate;
  const userAuth: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    { body: userCreate },
  );
  typia.assert(userAuth);
  TestValidator.equals(
    "registered and authorized user email matches input",
    userAuth.email,
    userCreate.email,
  );

  // 2. Create a todo as this user (all fields)
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // one week in future
  const todoCreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    due_date: dueDate,
    priority: RandomGenerator.pick(["low", "medium", "high"] as const),
  } satisfies ITodoTodo.ICreate;
  const createdTodo: ITodoTodo = await api.functional.todo.user.todos.create(
    connection,
    { body: todoCreate },
  );
  typia.assert(createdTodo);
  TestValidator.equals(
    "created todo title matches input",
    createdTodo.title,
    todoCreate.title,
  );
  TestValidator.equals(
    "created todo description matches input",
    createdTodo.description,
    todoCreate.description,
  );
  TestValidator.equals(
    "created todo due date matches input",
    createdTodo.due_date,
    todoCreate.due_date,
  );
  TestValidator.equals(
    "created todo priority matches input",
    createdTodo.priority,
    todoCreate.priority,
  );
  TestValidator.equals(
    "created todo is_completed should be false by default",
    createdTodo.is_completed,
    false,
  );

  // 3. Retrieve this todo by ID as same authenticated user
  const retrievedTodo: ITodoTodo = await api.functional.todo.user.todos.at(
    connection,
    { todoId: createdTodo.id },
  );
  typia.assert(retrievedTodo);

  // 4. Assert that detailed fields match creation
  TestValidator.equals(
    "retrieved todo id matches created todo",
    retrievedTodo.id,
    createdTodo.id,
  );
  TestValidator.equals(
    "retrieved todo user_id matches registered user",
    retrievedTodo.user_id,
    userAuth.id,
  );
  TestValidator.equals(
    "retrieved todo title matches",
    retrievedTodo.title,
    todoCreate.title,
  );
  TestValidator.equals(
    "retrieved todo description matches",
    retrievedTodo.description,
    todoCreate.description,
  );
  TestValidator.equals(
    "retrieved todo due_date matches",
    retrievedTodo.due_date,
    todoCreate.due_date,
  );
  TestValidator.equals(
    "retrieved todo priority matches",
    retrievedTodo.priority,
    todoCreate.priority,
  );
  TestValidator.equals(
    "retrieved todo is_completed should be false by default",
    retrievedTodo.is_completed,
    false,
  );
  TestValidator.equals(
    "retrieved todo created_at not null",
    typeof retrievedTodo.created_at === "string",
    true,
  );
  TestValidator.equals(
    "retrieved todo updated_at not null",
    typeof retrievedTodo.updated_at === "string",
    true,
  );
}
