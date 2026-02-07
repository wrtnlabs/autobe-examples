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

export async function test_api_todo_retrieve_own_active_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies ITodoUser.IJoin,
  });
  // 2. Create todo item
  const todo = await generate_random_todo_user_todos_create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      description: RandomGenerator.paragraph(),
    },
  });
  // 3. Retrieve todo item
  const retrievedTodo = await api.functional.todo.user.todos.at(
    userConnection,
    {
      todoId: todo.id,
    },
  );
  typia.assert(retrievedTodo);
  // 4. Validate
  TestValidator.equals("title matches", retrievedTodo.title, todo.title);
  TestValidator.equals(
    "description matches",
    retrievedTodo.description,
    todo.description,
  );
  TestValidator.equals(
    "is_completed is false",
    retrievedTodo.is_completed,
    false,
  );
  TestValidator.equals("deleted_at is null", retrievedTodo.deleted_at, null);
  TestValidator.equals("user.id matches", retrievedTodo.user.id, todo.user.id);
}
