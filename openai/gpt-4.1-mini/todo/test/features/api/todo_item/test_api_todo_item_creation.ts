import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

export async function test_api_todo_item_creation(connection: api.IConnection) {
  // 1. Create user and authenticate
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const user: ITodoUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "P@ssw0rd123",
      } satisfies ITodoUser.ICreate,
    },
  );
  typia.assert(user);

  // 2. Create todo item with realistic data
  const description = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 10,
  });
  const status = "pending" as const;
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const todoCreateBody = {
    description,
    status,
    due_date: dueDate,
  } satisfies ITodoItem.ICreate;

  const todoItem: ITodoItem = await api.functional.todo.user.todoItems.create(
    connection,
    {
      body: todoCreateBody,
    },
  );
  typia.assert(todoItem);

  // Validate returned data matches input
  TestValidator.equals(
    "todo description matches",
    todoItem.description,
    description,
  );
  TestValidator.equals("todo status matches", todoItem.status, status);
  TestValidator.equals("todo due_date matches", todoItem.due_date, dueDate);

  // Validate required timestamps exist and parse as ISO date strings
  TestValidator.predicate(
    "todo created_at is ISO string",
    typeof todoItem.created_at === "string" &&
      !isNaN(Date.parse(todoItem.created_at)),
  );
  TestValidator.predicate(
    "todo updated_at is ISO string",
    typeof todoItem.updated_at === "string" &&
      !isNaN(Date.parse(todoItem.updated_at)),
  );
}
