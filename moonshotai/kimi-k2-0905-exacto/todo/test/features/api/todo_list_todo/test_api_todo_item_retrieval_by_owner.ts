import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Validate that the owner of a todo item can retrieve its full record including
 * all properties.
 *
 * This test scenario performs:
 *
 * 1. User registration (ensures a unique owner for the todo).
 * 2. User authentication is established as part of registration (token auto
 *    handled).
 * 3. Create a new todo belonging to the user with well-formed test description and
 *    completed flag.
 * 4. Retrieve the todo by its id as the authenticated user.
 * 5. Asserts that the returned record matches creation data and business rules,
 *    checking description, completed state, and ownership context.
 */
export async function test_api_todo_item_retrieval_by_owner(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const userJoinResp: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(userJoinResp);
  typia.assert(userJoinResp.user);
  const userId = typia.assert(userJoinResp.user!.id!);
  TestValidator.equals("user email matches", userJoinResp.user!.email, email);
  TestValidator.predicate(
    "user is not locked",
    userJoinResp.user!.is_locked === false,
  );

  // 2. Create a new todo for this user
  const todoRequest = {
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 14,
    }) as string,
    completed: false,
  } satisfies ITodoListTodo.ICreate;
  const todo: ITodoListTodo = await api.functional.todoList.user.todos.create(
    connection,
    { body: todoRequest },
  );
  typia.assert(todo);
  TestValidator.equals(
    "todo description matches input",
    todo.description,
    todoRequest.description,
  );
  TestValidator.equals(
    "todo completed matches input",
    todo.completed,
    todoRequest.completed,
  );
  TestValidator.predicate(
    "created_at is ISO 8601",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(todo.created_at),
  );
  TestValidator.equals(
    "completed_at should be null/undefined when not completed",
    todo.completed_at,
    null,
  );
  TestValidator.equals(
    "deleted_at should be null/undefined on creation",
    todo.deleted_at,
    null,
  );

  // 3. Retrieve the todo by its id as the authenticated user
  const retrieved: ITodoListTodo = await api.functional.todoList.user.todos.at(
    connection,
    { todoId: todo.id },
  );
  typia.assert(retrieved);
  TestValidator.equals("retrieved todo id matches", retrieved.id, todo.id);
  TestValidator.equals(
    "retrieved description matches input",
    retrieved.description,
    todoRequest.description,
  );
  TestValidator.equals(
    "retrieved completed matches input",
    retrieved.completed,
    todoRequest.completed,
  );
  TestValidator.equals(
    "created_at same after retrieval",
    retrieved.created_at,
    todo.created_at,
  );
  TestValidator.predicate(
    "retrieved is not completed upon creation",
    !retrieved.completed,
  );
  TestValidator.equals(
    "retrieved completed_at should be null/undefined",
    retrieved.completed_at,
    null,
  );
  TestValidator.equals(
    "retrieved deleted_at should be null/undefined",
    retrieved.deleted_at,
    null,
  );
}
