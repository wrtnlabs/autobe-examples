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
 * Test privacy enforcement - user cannot complete another user's todo.
 *
 * This test validates complete data isolation between users.
 * A user should only be able to complete their own todos.
 * Attempting to complete another user's todo should return 404 Not Found
 * (the todo does not exist from the requesting user's perspective).
 */
export async function test_api_todo_complete_privacy_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. User A joins and creates a todo
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userAConnection, {});
  const todoA = await generate_random_todo_app_user_todos_create(
    userAConnection,
    {},
  );
  typia.assert(todoA);
  // Verify todo is initially incomplete
  TestValidator.equals("User A todo is incomplete", todoA.isCompleted, false);
  // 2. User B joins (different account)
  const userBConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userBConnection, {});
  // 3. User B attempts to complete User A's todo - should fail
  await TestValidator.httpError(
    "User B cannot complete User A's todo",
    404,
    async () =>
      await api.functional.todoApp.user.todos.complete(userBConnection, {
        todoId: todoA.id,
      }),
  );
}
