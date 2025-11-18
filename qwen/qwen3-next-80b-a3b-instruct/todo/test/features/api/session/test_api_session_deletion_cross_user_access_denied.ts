import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_session_deletion_cross_user_access_denied(
  connection: api.IConnection,
) {
  const userAEmail = typia.random<string & tags.Format<"email">>();
  const userAPassword = "securepassword123";

  const userA: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userAEmail,
        password: userAPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userA);

  const userBEmail = typia.random<string & tags.Format<"email">>();
  const userBPassword = "anothersecurepassword456";

  const userB: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userBEmail,
        password: userBPassword,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(userB);

  // Use userB's connection to attempt deletion of userA's session
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "cross-user session deletion should be denied",
    async () => {
      await api.functional.todoList.user.actors.sessions.erase(connection, {
        userId: userA.id,
        sessionId: sessionId,
      });
    },
  );
}
