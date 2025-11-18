import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import type { ITodoListTodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodoListUser";

export async function test_api_todo_list_todo_get_by_id_with_user_join(
  connection: api.IConnection,
) {
  // 1. Register a new user using the join endpoint
  const userCreateBody = {
    email: `${RandomGenerator.alphabets(5)}@example.com`,
    name: RandomGenerator.name(2),
  } satisfies ITodoListTodoListUser.ICreate;

  // Register the user and retrieve the authorized user including JWT token
  const authorizedUser: ITodoListTodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Use the newly authenticated user context (token managed automatically)

  // 3. Prepare to fetch an existing todo item belonging to the newly registered user
  // Since the system does not expose todo creation here, mimic a todo with valid ID and user ID

  // For testing, create a random plausible todoListTodoId and link to user's id
  const todoListTodoId = typia.random<string & tags.Format<"uuid">>();

  // 4. Use the at API to fetch todo details by ID
  const todoItem: ITodoListTodo =
    await api.functional.todoList.user.todoListTodos.at(connection, {
      todoListTodoId,
    });
  typia.assert(todoItem);

  // 5. Validate that the fetched todo item belongs to the authenticated user
  TestValidator.equals(
    "todo item belongs to authorized user",
    todoItem.todoListUserId,
    authorizedUser.id,
  );

  // 6. Validate critical fields exist and have correct types
  TestValidator.predicate("todo item has id", typeof todoItem.id === "string");
  TestValidator.predicate(
    "todo item has title",
    typeof todoItem.title === "string",
  );
  TestValidator.predicate(
    "todo item has isComplete boolean",
    typeof todoItem.isComplete === "boolean",
  );
  TestValidator.predicate(
    "todo item has createdAt string",
    typeof todoItem.createdAt === "string",
  );
  TestValidator.predicate(
    "todo item has updatedAt string",
    typeof todoItem.updatedAt === "string",
  );

  // 7. Optional fields (description, deletedAt) - allow null or string
  TestValidator.predicate(
    "todo item description is string or null or undefined",
    todoItem.description === null ||
      typeof todoItem.description === "string" ||
      todoItem.description === undefined,
  );
  TestValidator.predicate(
    "todo item deletedAt is string or null or undefined",
    todoItem.deletedAt === null ||
      typeof todoItem.deletedAt === "string" ||
      todoItem.deletedAt === undefined,
  );
}
