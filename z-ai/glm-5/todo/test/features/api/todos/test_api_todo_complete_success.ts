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
 * Test marking a todo as complete.
 *
 * Steps:
 * 1. User joins to obtain authentication tokens
 * 2. User creates a new todo with title 'Complete this task'
 * 3. Verify the created todo has isCompleted=false
 * 4. Call the complete endpoint to mark the todo as complete
 * 5. Verify the response has isCompleted=true
 * 6. Verify updatedAt is more recent than createdAt
 */
export async function test_api_todo_complete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a new todo
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: "Complete this task",
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Verify initial state is incomplete
  TestValidator.equals(
    "initial isCompleted should be false",
    todo.isCompleted,
    false,
  );
  // 4. Mark todo as complete
  const completedTodo = await api.functional.todoApp.user.todos.complete(
    userConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(completedTodo);
  // 5. Verify completion status changed
  TestValidator.equals(
    "isCompleted should be true",
    completedTodo.isCompleted,
    true,
  );
  // 6. Verify updatedAt is more recent than createdAt
  const createdAtTime = new Date(todo.createdAt).getTime();
  const updatedAtTime = new Date(completedTodo.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt should be more recent than createdAt",
    updatedAtTime >= createdAtTime,
  );
  // 7. Verify the todo id remains the same
  TestValidator.equals(
    "todo id should remain the same",
    completedTodo.id,
    todo.id,
  );
}
