import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_retrieve_by_id_unauthenticated(
  connection: api.IConnection,
) {
  // Create a new user account to establish context
  const newUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(newUser);

  // Create a new connection without the authentication header (unauthenticated)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Attempt to retrieve the user account without authentication
  await TestValidator.error(
    "unauthenticated request should fail with 401 or 403",
    async () => {
      await api.functional.todoList.user.actors.at(unauthenticatedConnection, {
        userId: newUser.id,
      });
    },
  );
}
