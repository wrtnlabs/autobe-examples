import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_session_deletion_unauthenticated(
  connection: api.IConnection,
) {
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  const userId = user.id;
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return 401 Unauthorized without authentication",
    async () => {
      await api.functional.todoList.user.actors.sessions.erase(connection, {
        userId: userId,
        sessionId: sessionId,
      });
    },
  );
}
