import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todo_retrieval_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection specifically for user authorization
  const authConnection: api.IConnection = { host: connection.host };
  // Create authenticated user using utility function
  const authorized = await authorize_user_join(authConnection, {});
  typia.assert(authorized);
  // Create user-specific connection for todo operations
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Generate a random UUID that doesn't exist in the system
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent todo and expect 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent todo",
    404,
    async () => {
      await api.functional.todoApp.user.todos.at(userConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
