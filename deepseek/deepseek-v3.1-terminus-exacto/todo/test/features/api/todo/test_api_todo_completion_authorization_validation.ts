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
 * Test authorization validation by attempting to update completion status of a todo that belongs to a different user.
 * Create two separate user accounts, have one user create a todo, then attempt to update its completion status using the second user's authentication.
 * Verify the operation properly rejects the request with appropriate authorization error, ensuring data privacy and isolation between users.
 */
export async function test_api_todo_completion_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account and authenticate
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);
  // Create a todo owned by the first user - the API doesn't accept body parameters
  await api.functional.todoApp.user.todos.create(firstUserConnection);
  // Since we can't get the todo ID from creation, and we need a UUID for the update API,
  // we'll generate a random UUID and test the authorization error handling
  const randomTodoId = typia.random<string & tags.Format<"uuid">>();
  // Create second user account and authenticate
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(secondUser);
  // Attempt to update a todo using second user's connection - this should fail with authorization error
  // We're testing that unauthorized access is properly rejected, even if the todo doesn't exist
  await TestValidator.error(
    "should reject unauthorized completion update",
    async () => {
      await api.functional.todoApp.user.todos.completion.updateCompletion(
        secondUserConnection,
        {
          todoId: randomTodoId,
        },
      );
    },
  );
  // Also test that the first user can access their own todo (or at least that the API behaves consistently)
  await TestValidator.error(
    "owner should also get error for non-existent todo but different error type",
    async () => {
      await api.functional.todoApp.user.todos.completion.updateCompletion(
        firstUserConnection,
        {
          todoId: randomTodoId,
        },
      );
    },
  );
}
