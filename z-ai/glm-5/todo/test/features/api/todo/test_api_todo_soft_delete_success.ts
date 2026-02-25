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
 * Test the primary success path for soft-deleting a todo.
 *
 * A user creates a todo with all fields (title, description, start_date, due_date),
 * then soft-deletes it. The test validates:
 *
 * 1. User authentication succeeds
 * 2. Todo creation with complete data and correct initial state
 * 3. Soft delete operation completes without throwing an error
 *
 * Note: The delete endpoint returns void, so verification of is_deleted flag,
 * trash listing, and edit history preservation requires additional endpoints
 * not available in this test scope.
 */
export async function test_api_todo_soft_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create a todo with all fields
  const todoData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  } satisfies ITodoAppTodo.ICreate;
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {
      body: todoData,
    },
  );
  typia.assert(todo);
  // Validate todo initial state
  TestValidator.equals("todo is not deleted initially", todo.isDeleted, false);
  TestValidator.equals("todo is incomplete initially", todo.isCompleted, false);
  TestValidator.equals("todo title matches input", todo.title, todoData.title);
  // 3. Soft delete the todo - should complete without error
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: todo.id,
  });
  // Note: The erase endpoint returns void, so successful completion
  // without throwing an error validates the soft delete succeeded.
  // Full verification would require additional endpoints:
  // - GET /todoApp/user/todos/{todoId} to verify is_deleted = true
  // - GET /todoApp/user/todos to verify it's not in active list
  // - GET /todoApp/user/trash to verify it's in trash list
}
