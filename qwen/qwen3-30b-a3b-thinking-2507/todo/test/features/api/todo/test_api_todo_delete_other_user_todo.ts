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

export async function test_api_todo_delete_other_user_todo(
  connection: api.IConnection,
) {
  // Create primary user (todo owner)
  const primaryConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(primaryConnection, { body: {} });
  // Create todo as primary user
  const primaryTodo = (await generate_random_todo_user_todos_create(
    primaryConnection,
    {
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  )) satisfies ITodoTodo;
  typia.assert(primaryTodo);
  // Create secondary user (attempting to delete)
  const secondaryConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(secondaryConnection, { body: {} });
  // Attempt to delete the todo as secondary user (should fail)
  await TestValidator.httpError(
    "should return 403 Forbidden when user tries to delete another user's todo",
    403,
    async () => {
      await api.functional.todo.user.todos.erase(secondaryConnection, {
        todoId: primaryTodo.id,
      });
    },
  );
}
