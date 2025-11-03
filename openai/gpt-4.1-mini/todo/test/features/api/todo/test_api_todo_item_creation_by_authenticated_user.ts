import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_item_creation_by_authenticated_user(
  connection: api.IConnection,
) {
  // 1. Register a new user via the join endpoint to obtain authentication tokens
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: `user${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "password123",
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create a new todo item with valid description and status
  const todoItemCreateBody = {
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
    status: "pending" as "pending",
    due_date: null,
  } satisfies ITodoItem.ICreate;

  const todoItem: ITodoItem = await api.functional.todo.user.todoItems.create(
    connection,
    {
      body: todoItemCreateBody,
    },
  );
  typia.assert(todoItem);

  // 3. Validate the created todo item matches inputs and has required fields
  TestValidator.equals(
    "todo item description",
    todoItem.description,
    todoItemCreateBody.description,
  );
  TestValidator.equals(
    "todo item status",
    todoItem.status,
    todoItemCreateBody.status,
  );
  TestValidator.equals(
    "todo item due_date",
    todoItem.due_date,
    todoItemCreateBody.due_date,
  );
  TestValidator.predicate(
    "todo item has valid id format",
    /^[0-9a-f-]{36}$/i.test(todoItem.id),
  );
  TestValidator.predicate(
    "todo item has created_at timestamp",
    typeof todoItem.created_at === "string" && todoItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "todo item has updated_at timestamp",
    typeof todoItem.updated_at === "string" && todoItem.updated_at.length > 0,
  );
}
