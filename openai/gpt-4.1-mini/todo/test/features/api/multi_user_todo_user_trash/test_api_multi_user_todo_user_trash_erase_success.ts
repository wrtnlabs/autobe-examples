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

export async function test_api_multi_user_todo_user_trash_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates the successful permanent deletion of a soft-deleted todo.
  // 1. Register (join) a new user using authorization utility
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(joinConnection, {
    body: typia.random<IMultiUserTodoUser.IJoin>(),
  });
  // 2. Create a new user connection authorized with the obtained token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorizedUser.token.access}`,
  };
  // 3. Call user.trash.erase to permanently delete a todo from trash
  const eraseResponse = await api.functional.multiUserTodo.user.trash.erase(
    userConnection,
    {
      todoId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  // 4. Assert the eraseResponse is a valid IMultiUserTodoTodo
  typia.assert(eraseResponse);
}
