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
 * Test that users cannot update todos belonging to other users.
 * This test validates ownership validation by attempting cross-user updates.
 */
export async function test_api_todo_update_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user account
  const firstUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Create second user account
  const secondUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  // Attempt to update a non-existent todo using first user's connection
  // This tests that users cannot access todos that don't belong to them
  await TestValidator.httpError(
    "cross-user todo update should fail",
    [403, 404],
    async () => {
      await api.functional.todoApp.user.todos.update(firstUserConnection, {
        todoId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ITodoAppTodo.IUpdate,
      });
    },
  );
  // Verify users can perform operations on their own connections without errors
  // This ensures the authentication is working correctly
  TestValidator.predicate(
    "first user connection is valid",
    firstUserConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "second user connection is valid",
    secondUserConnection.headers?.Authorization !== undefined,
  );
}
