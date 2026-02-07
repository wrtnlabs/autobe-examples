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

export async function test_api_todo_permanent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {
    body: {} satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authResult);
  // Generate a random todo ID that doesn't exist
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  // Try to permanently delete a todo that doesn't exist
  // Expected to throw 404 Not Found error
  await TestValidator.httpError(
    "deleting non-existent todo should return 404",
    404,
    async () => {
      await api.functional.todoApp.user.trash.erase(userConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
