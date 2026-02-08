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

export async function test_api_user_todo_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {
    body: {} satisfies IMultiUserTodoUser.IJoin,
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // Attempt to retrieve a non-existent or unauthorized todo ID (random UUID)
  const fakeTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "todo retrieval of non-existent or unauthorized todo should fail with 404",
    404,
    async () => {
      await api.functional.multiUserTodo.user.todos.at(userConnection, {
        todoId: fakeTodoId,
      });
    },
  );
}
