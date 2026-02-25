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
 * Test idempotent behavior when marking an already-complete todo as complete.
 * Steps:
 * 1. User joins via /todoApp/auth/user/join
 * 2. User creates a todo via POST /todoApp/user/todos
 * 3. User marks the todo as complete via PATCH /todoApp/user/todos/{todoId}/complete - verify isCompleted=true
 * 4. User calls PATCH /todoApp/user/todos/{todoId}/complete again on the same todo
 * 5. Verify the operation succeeds without error (200 OK)
 * 6. Verify isCompleted remains true (idempotent)
 * 7. Verify updatedAt is updated to the new timestamp
 */
export async function test_api_todo_complete_already_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and join
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a todo
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo);
  // Verify todo is initially incomplete
  TestValidator.equals("initial completion status", todo.isCompleted, false);
  // Store initial updatedAt
  const firstUpdatedAt: string = todo.updatedAt;
  // Wait a bit to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 3. Mark as complete first time
  const completedTodo = await api.functional.todoApp.user.todos.complete(
    userConnection,
    { todoId: todo.id },
  );
  typia.assert(completedTodo);
  TestValidator.equals(
    "first complete - isCompleted",
    completedTodo.isCompleted,
    true,
  );
  // Store the updatedAt after first completion
  const secondUpdatedAt: string = completedTodo.updatedAt;
  // Wait a bit to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Mark as complete again (idempotent operation)
  const reCompletedTodo = await api.functional.todoApp.user.todos.complete(
    userConnection,
    { todoId: todo.id },
  );
  typia.assert(reCompletedTodo);
  // 5. Verify the operation succeeds without error (if we get here, it succeeded)
  // 6. Verify isCompleted remains true (idempotent)
  TestValidator.equals(
    "second complete - isCompleted still true",
    reCompletedTodo.isCompleted,
    true,
  );
  // 7. Verify updatedAt is updated to the new timestamp
  TestValidator.predicate(
    "updatedAt updated after second complete",
    reCompletedTodo.updatedAt !== secondUpdatedAt,
  );
}
