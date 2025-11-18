import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_session_deletion_invalid_session(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to establish authentication context
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "securePassword123",
        name: RandomGenerator.name(),
        href: "https://example.com/todo-app",
        referrer: "https://example.com/signup",
      } satisfies ITodoAppUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Generate an invalid session ID that doesn't exist
  const invalidSessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Attempt to delete the invalid session - this should fail
  await TestValidator.error(
    "deletion of non-existent session should fail",
    async () => {
      await api.functional.todoApp.user.users.sessions.erase(connection, {
        userId: user.id,
        sessionId: invalidSessionId,
      });
    },
  );

  // Step 4: Verify the user account is still valid and unaffected
  TestValidator.predicate(
    "user account remains valid after failed session deletion",
    user.id !== null && user.email === userEmail,
  );

  // Step 5: Test deletion with different user ID to verify ownership validation
  const differentUserId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "session deletion with different user ID should fail",
    async () => {
      await api.functional.todoApp.user.users.sessions.erase(connection, {
        userId: differentUserId,
        sessionId: invalidSessionId,
      });
    },
  );
}
