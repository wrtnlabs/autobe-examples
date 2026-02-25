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
 * Test idempotent behavior when marking an already incomplete todo as incomplete.
 *
 * Scenario:
 * 1. User registers and authenticates
 * 2. User creates a todo (defaults to incomplete status)
 * 3. Call incomplete endpoint on already incomplete todo
 * 4. Verify the operation succeeds without error (idempotent behavior)
 * 5. Verify the todo is returned with is_completed still false
 */
export async function test_api_todo_incomplete_idempotent_already_incomplete(
  connection: api.IConnection,
): Promise<void> {
  // 1. User setup - create and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Create a todo (defaults to incomplete status)
  const todo = await generate_random_todo_app_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo);
  // 3. Verify the todo is incomplete by default
  TestValidator.predicate("todo is incomplete by default", !todo.isCompleted);
  // 4. Call incomplete endpoint on already incomplete todo (idempotent operation)
  const result = await api.functional.todoApp.user.todos.incomplete(
    userConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(result);
  // 5. Verify idempotent behavior - operation should succeed
  TestValidator.equals("operation succeeds", result.id, todo.id);
  TestValidator.predicate("todo remains incomplete", !result.isCompleted);
  TestValidator.equals("todo id unchanged", result.id, todo.id);
}
