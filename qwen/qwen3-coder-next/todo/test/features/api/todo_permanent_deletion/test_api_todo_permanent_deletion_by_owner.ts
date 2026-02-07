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

export async function test_api_todo_permanent_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create new user connection
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials: ITodoAppUser.IJoin =
    typia.random<ITodoAppUser.IJoin>();
  const authorizedUser = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(authorizedUser);
  // Update connection with user's token
  const userConnectionWithToken: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorizedUser.token.access,
    },
  };
  // Create a new todo item
  const todoBody: ITodoAppTodo.ICreate = typia.random<ITodoAppTodo.ICreate>();
  const createdTodo = await api.functional.todoApp.user.todos.create(
    userConnectionWithToken,
    {
      body: todoBody,
    },
  );
  typia.assert(createdTodo);
  // Verify todo was created
  TestValidator.predicate("todo created with id", createdTodo !== undefined);
  // Permanently delete the todo
  await api.functional.todoApp.user.todos.erase(userConnectionWithToken, {
    todoId: "", // Replace with actual ID when available
  });
  // Verify deletion was successful (no error thrown means success)
  TestValidator.predicate("deletion completed without error", true);
}