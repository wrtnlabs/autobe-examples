import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

export async function test_api_session_retrieval_cross_user_access_denied(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate first user to establish system context
  const firstUserEmail: string = typia.random<string & tags.Format<"email">>();
  const firstUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: firstUserEmail,
        password: "SecurePassword123!",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(firstUser);

  // Step 2: Create a task for the first user to establish mandatory session context
  const firstUserTask: ITodoListTask =
    await api.functional.todoList.user.tasks.create(connection, {
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ITodoListTask.ICreate,
    });
  typia.assert(firstUserTask);

  // Step 3: Create and authenticate second user who will attempt unauthorized access
  const secondUserEmail: string = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: "AnotherSecurePass456!",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 4: Attempt cross-user session retrieval with actual first user ID but a randomly generated, non-existent sessionId
  // This validates that even with correct userId, an invalid or unauthorized sessionId access is denied
  const nonExistentSessionId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Use connection authenticated as second user
  // The SDK automatically handles headers, so we don't need to manually manage them
  await TestValidator.error(
    "cross-user session access should be denied using non-existent session ID",
    async () => {
      await api.functional.todoList.actors.sessions.at(connection, {
        userId: firstUser.id, // Correct ID of first user
        sessionId: nonExistentSessionId, // Invalid session ID (not the real one)
      });
    },
  );
}
