import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_erase_not_found_todo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody: IMultiUserTodoUser.IJoin = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "TestPassword123!",
    displayName: RandomGenerator.name(),
    href: "https://localhost/join",
    referrer: "https://localhost/",
    ip: null,
  };
  const authorized = await authorize_user_join(
    { host: connection.host },
    { body: joinBody },
  );
  userConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Try to delete a non-existing todoId
  const fakeTodoId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existing todo should return 404",
    404,
    async () => {
      await api.functional.multiUserTodo.user.todos.erase(userConnection, {
        todoId: fakeTodoId,
      });
    },
  );
}
