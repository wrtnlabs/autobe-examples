import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_app_user_todos_create } from "../../../generate/generate_random_todo_app_user_todos_create";
import { prepare_random_todo_app_todo } from "../../../prepare/prepare_random_todo_app_todo";

/**
 * Test creating a todo item with only the required title field.
 * Validates that optional fields correctly default to null when not provided.
 */
export async function test_api_todo_create_with_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_user_join(userConnection, {});
  typia.assert(authResponse);
  // 2. Create a todo with only the title field
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: { title } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Validate the response
  TestValidator.equals("title matches", todo.title, title);
  TestValidator.equals("description is null", todo.description, null);
  TestValidator.equals("startDate is null", todo.startDate, null);
  TestValidator.equals("dueDate is null", todo.dueDate, null);
  TestValidator.equals(
    "isCompleted defaults to false",
    todo.isCompleted,
    false,
  );
  TestValidator.equals("isDeleted defaults to false", todo.isDeleted, false);
  TestValidator.equals("user id matches", todo.user.id, authResponse.id);
  TestValidator.predicate("createdAt is valid", todo.createdAt.length > 0);
  TestValidator.predicate("updatedAt is valid", todo.updatedAt.length > 0);
}
