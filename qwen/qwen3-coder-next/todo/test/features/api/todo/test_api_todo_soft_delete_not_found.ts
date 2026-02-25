import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_soft_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.todoApp.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Update connection with the authentication token
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: authorized.token.access,
  };
  // 3. Attempt to delete a non-existent todo
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Verify that deleting a non-existent todo returns 404
  await TestValidator.error(
    "should return 404 for non-existent todo",
    async () => {
      await api.functional.todoApp.user.todos.erase(userConnection, {
        todoId: nonExistentId,
      });
    },
  );
}
