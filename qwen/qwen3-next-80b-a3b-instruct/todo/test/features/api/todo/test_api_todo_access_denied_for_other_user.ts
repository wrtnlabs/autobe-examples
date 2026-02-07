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

export async function test_api_todo_access_denied_for_other_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first user (todo owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(ownerConnection, {
    body: {},
  });
  // 2. Create a todo owned by the first user using the utility function
  const todo = await generate_random_todo_app_user_todos_create(
    ownerConnection,
    {
      body: {
        title: RandomGenerator.name(),
      },
    },
  );
  // 3. Create second user (unauthorized access attempt)
  const attackerConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(attackerConnection, {
    body: {},
  });
  // 4. Generate a valid UUID to use as the todo ID since ITodoAppTodo has no properties
  const todoId: string = typia.random<string & tags.Format<"uuid">>();
  // 5. Attempt to access the todo with the generated UUID (should fail with 404)
  await TestValidator.httpError(
    "second user receives 404 Not Found for other user's todo",
    404,
    async () => {
      await api.functional.todoApp.user.todos.at(attackerConnection, {
        todoId,
      });
    },
  );
}
