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

export async function test_api_todo_completion_toggle_to_incomplete(
  connection: api.IConnection,
) {
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<ITodoAppUser.IJoin>(),
  });
  const todo: ITodoAppTodo =
    await generate_random_todo_app_user_todos_create(userConnection, {});
  const completedTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.complete(userConnection, {
      id: todo.id,
    });
  typia.assert(completedTodo);
  TestValidator.equals("status to complete", completedTodo.is_complete, true);
  const toggledTodo: ITodoAppTodo =
    await api.functional.todoApp.user.todos.complete(userConnection, {
      id: todo.id,
    });
  typia.assert(toggledTodo);
  TestValidator.equals("status to incomplete", toggledTodo.is_complete, false);
}