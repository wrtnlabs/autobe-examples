import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_user_todos_create } from "../../../generate/generate_random_todo_user_todos_create";
import { prepare_random_todo_todo } from "../../../prepare/prepare_random_todo_todo";

export async function test_api_todo_delete_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as user
  const authResult = await authorize_user_join(connection, {
    body: typia.random<ITodoUser.IJoin>(),
  });
  // Create a new connection for the user
  const userConnection: api.IConnection = { host: connection.host };
  // Set the authorization header
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${authResult.token.access}`,
  };
  // 2. Create todo item
  const todo = await generate_random_todo_user_todos_create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 1 }),
      description: RandomGenerator.paragraph({ sentences: 2 }),
      start_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
  // 3. Delete todo
  await api.functional.todo.user.trash.erase(userConnection, {
    todoId: todo.id,
  });
}
