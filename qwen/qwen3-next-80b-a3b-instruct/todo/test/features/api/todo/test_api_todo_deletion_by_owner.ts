import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_todo_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the user and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const user: ITodoAppUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppUser.IJoin,
    },
  );
  // Step 2: Attempt to delete a non-existent todo item with a random UUID
  // This should return a 404 error since the todo doesn't exist
  await TestValidator.error(
    "deletion should fail with 404 for non-existent todo item",
    async () => {
      const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.todoApp.user.todos.erase(userConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
