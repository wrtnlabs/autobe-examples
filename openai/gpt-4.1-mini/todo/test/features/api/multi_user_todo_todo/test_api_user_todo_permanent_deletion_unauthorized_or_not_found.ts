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

export async function test_api_user_todo_permanent_deletion_unauthorized_or_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection with join
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: `Bearer ${userJoinResult.token.access}`,
  };
  // 2. Create a todo for this user
  const todoCreated = await generate_random_multi_user_todo_user_todos_create(
    userConnection,
    { body: { title: RandomGenerator.paragraph({ sentences: 1 }) } },
  );
  typia.assert(todoCreated);
  // 3. Attempt to delete a different todoId (simulate unauthorized or not found)
  // Use a random UUID to simulate unauthorized/not found
  const attemptDeleteId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "user permanent delete unauthorized or not found",
    [403, 404],
    async () => {
      await api.functional.multiUserTodo.user.todos.erase(userConnection, {
        todoId: attemptDeleteId,
      });
    },
  );
}
