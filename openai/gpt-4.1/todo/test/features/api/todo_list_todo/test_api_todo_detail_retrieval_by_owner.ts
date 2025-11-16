import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate authenticated user can retrieve a todo they own by its ID and
 * confirm all fields match creation.
 *
 * 1. Register a new user and store token.
 * 2. Create a new todo (with title and optional description).
 * 3. Retrieve the created todo using the detail endpoint and its id.
 * 4. Assert all returned fields (title, description, is_completed, created_at,
 *    updated_at) match creation response.
 * 5. Ensure is_completed is false and that timestamps are present.
 */
export async function test_api_todo_detail_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userJoinInput = {
    email: typia.random<
      string & tags.MinLength<1> & tags.MaxLength<254> & tags.Format<"email">
    >(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
  } satisfies ITodoListUser.ICreate;
  const joinRes = await api.functional.auth.user.join(connection, {
    body: userJoinInput,
  });
  typia.assert(joinRes);

  // 2. Create a todo
  const createTodoInput = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 3,
      wordMin: 5,
      wordMax: 12,
    }),
  } satisfies ITodoListTodo.ICreate;
  const createdTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: createTodoInput },
  );
  typia.assert(createdTodo);

  // 3. Retrieve the todo by ID
  const retrievedTodo = await api.functional.todoList.user.todos.at(
    connection,
    { todoId: createdTodo.id },
  );
  typia.assert(retrievedTodo);

  // 4. Assert all fields match the created todo
  TestValidator.equals("todo id matches", retrievedTodo.id, createdTodo.id);
  TestValidator.equals(
    "title matches",
    retrievedTodo.title,
    createTodoInput.title,
  );
  TestValidator.equals(
    "description matches",
    retrievedTodo.description,
    createTodoInput.description,
  );
  TestValidator.predicate(
    "is_completed is false",
    retrievedTodo.is_completed === false,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedTodo.created_at,
    createdTodo.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedTodo.updated_at,
    createdTodo.updated_at,
  );
}
