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

export async function test_api_todo_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. First user registration and authentication
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = typia.random<ITodoAppUser.IJoin>();
  const firstUserToken = await authorize_user_join(firstUserConnection, {
    body: firstUser,
  });
  // 2. First user creates a todo item
  const todoBody = typia.random<ITodoAppTodo.ICreate>();
  const createdTodo = await api.functional.todoApp.user.todos.create(
    firstUserConnection,
    {
      body: todoBody,
    },
  );
  typia.assert(createdTodo);
  // 3. Second user registration and authentication
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = typia.random<ITodoAppUser.IJoin>();
  const secondUserToken = await authorize_user_join(secondUserConnection, {
    body: secondUser,
  });
  // 4. Second user attempts to access first user's todo - should fail
  await TestValidator.error("cross-user access denied", async () => {
    await api.functional.todoApp.user.todos.at(secondUserConnection, {
      todoId: (createdTodo as any).id,
    });
  });
}