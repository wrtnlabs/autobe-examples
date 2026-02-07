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
 * Test retrieval of a non-existent todo ID.
 *
 * Authenticate as a user, then attempt to retrieve a todo using a randomly
 * generated UUID that doesn't exist in the system. Validate that the operation
 * returns an appropriate error response indicating the todo was not found.
 * This tests the system's handling of invalid todo identifiers and ensures
 * proper error messaging for non-existent resources.
 */
export async function test_api_todo_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Authenticate as a user using the join utility function
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Generate a random UUID that doesn't exist in the system
  const nonExistentTodoId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent todo and validate it fails
  await TestValidator.error(
    "retrieving non-existent todo should fail",
    async () => {
      await api.functional.todoApp.user.todos.at(userConnection, {
        todoId: nonExistentTodoId,
      });
    },
  );
}
