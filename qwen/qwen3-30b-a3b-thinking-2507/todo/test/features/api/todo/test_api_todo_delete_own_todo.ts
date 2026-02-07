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

export async function test_api_todo_delete_own_todo(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const token = await authorize_user_join(userConnection, { body: {} });
  const createdTodo: ITodoTodo = await generate_random_todo_user_todos_create(
    userConnection,
    { body: {} },
  );
  const deletedTodo: ITodoTodo = await api.functional.todo.user.todos.erase(
    userConnection,
    {
      todoId: createdTodo.id,
    },
  );
  typia.assert(deletedTodo);
  TestValidator.predicate(
    "deleted_at timestamp set",
    deletedTodo.deleted_at !== null && deletedTodo.deleted_at !== undefined,
  );
}
