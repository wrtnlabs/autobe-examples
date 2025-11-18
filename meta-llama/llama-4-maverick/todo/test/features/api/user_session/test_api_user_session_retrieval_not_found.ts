import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_user_session_retrieval_not_found(
  connection: api.IConnection,
) {
  // Create a new user
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        name: RandomGenerator.name(),
        password: "1234",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Attempt to retrieve a non-existent session
  const nonExistentSessionId = typia.random<string>();
  await TestValidator.error(
    "retrieving non-existent session should fail",
    async () =>
      await api.functional.todoList.user.users.sessions.at(connection, {
        userId: user.id,
        sessionId: nonExistentSessionId,
      }),
  );
}
