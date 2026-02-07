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

export async function test_api_todo_retrieval_deleted_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration
  const userConnection: api.IConnection = { host: connection.host };
  const userCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies ITodoAppUser.IJoin;
  const authorized = await authorize_user_join(userConnection, {
    body: userCreds,
  });
  typia.assert(authorized);
  // 2. Create todo item
  const todo = await api.functional.todoApp.user.todos.create(userConnection, {
    body: {
      title: RandomGenerator.name(),
    } satisfies ITodoAppTodo.ICreate,
  });
  typia.assert(todo);
  // 3. Delete the todo item
  await api.functional.todoApp.user.todos.erase(userConnection, {
    todoId: (todo as any).id,
  });
  // 4. Attempt to retrieve deleted todo item
  // Should return error (not found)
  await TestValidator.error("deleted todo not found", async () => {
    await api.functional.todoApp.user.todos.at(userConnection, {
      todoId: (todo as any).id,
    });
  });
}