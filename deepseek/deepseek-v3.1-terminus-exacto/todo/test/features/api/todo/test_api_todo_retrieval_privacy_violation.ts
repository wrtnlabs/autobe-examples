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

/**
 * Test privacy protection by attempting to access a todo that doesn't belong to the user.
 * Create two separate user accounts, then authenticate as the second user and attempt
 * to retrieve a random todo ID. Validate that the operation returns an appropriate
 * authorization error or not found response, ensuring users cannot access todos
 * belonging to other users or non-existent todos.
 */
export async function test_api_todo_retrieval_privacy_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first user
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);
  // 2. Create and authenticate second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);
  // 3. Attempt to access a random todo ID using second user's connection
  // This tests that users cannot access todos that don't belong to them
  await TestValidator.error(
    "should not access non-existent or other user's todo",
    async () => {
      await api.functional.todoApp.user.todos.at(secondUserConnection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
