import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_todos_create } from "../../../generate/generate_random_multi_user_todo_user_todos_create";
import { prepare_random_multi_user_todo_todo } from "../../../prepare/prepare_random_multi_user_todo_todo";

export async function test_api_user_todo_permanent_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. User joins and gets authorized
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: typia.random<IMultiUserTodoUser.IJoin>(),
  });
  typia.assert(authorized);
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. User creates a todo
  const todo = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    {},
  );
  typia.assert(todo);
  // extract id from todo object safely
  const todoId = (todo as any).id as string;
  // 3. User deletes the todo permanently
  await api.functional.multiUserTodo.user.todos.erase(userConnection, {
    todoId: todoId,
  });
  // 4. Verify that the todo is permanently deleted by attempting to delete it again
  await TestValidator.error(
    "todo permanent deletion fails on non-existent todo",
    async () => {
      await api.functional.multiUserTodo.user.todos.erase(userConnection, {
        todoId: todoId,
      });
    },
  );
}
