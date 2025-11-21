import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUserListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserListUser";
import type { ITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserTodo";

export async function test_api_todo_creation_by_user(
  connection: api.IConnection,
) {
  // Step 1: Register a new user to get authentication tokens
  const joinInput = {
    email: `${RandomGenerator.alphabets(10)}@test.com`,
    password: "password123",
  } satisfies ITodoListUserListUser.IJoin;

  const userAuth: ITodoListUserListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinInput,
    });
  typia.assert(userAuth);

  // Step 2: Create a new todo item using the authenticated user's credentials
  const todoInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ITodoListUserTodo.ICreate;

  const createdTodo: ITodoListUserTodo =
    await api.functional.todoList.user.users.todos.create(connection, {
      userId: userAuth.id,
      body: todoInput,
    });
  typia.assert(createdTodo);

  // Step 3: Validate the response contains the correct todo item properties
  TestValidator.equals(
    "todo ID should be a valid UUID",
    typeof createdTodo.id,
    "string",
  );
  TestValidator.predicate("todo ID should match UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdTodo.id,
    ),
  );
  TestValidator.equals(
    "todo title should match input",
    createdTodo.title,
    todoInput.title,
  );
  TestValidator.equals(
    "todo should not be completed by default",
    createdTodo.completed,
    false,
  );
  TestValidator.equals(
    "todo user ID should match authenticated user",
    createdTodo.todo_list_user_id,
    userAuth.id,
  );
  TestValidator.equals(
    "todo description should be undefined by default",
    createdTodo.description,
    undefined,
  );
  TestValidator.predicate(
    "todo should have creation timestamp",
    () =>
      createdTodo.created_at !== undefined && createdTodo.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo should have update timestamp",
    () =>
      createdTodo.updated_at !== undefined && createdTodo.updated_at.length > 0,
  );
  TestValidator.predicate(
    "creation and update timestamps should be valid dates",
    () => {
      const createdDate = new Date(createdTodo.created_at);
      const updatedDate = new Date(createdTodo.updated_at);
      return !isNaN(createdDate.getTime()) && !isNaN(updatedDate.getTime());
    },
  );
}
