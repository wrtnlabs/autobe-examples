import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test session deletion attempts on another user's sessions to verify proper
 * ownership validation and access control enforcement. This validates that
 * users cannot terminate sessions belonging to other accounts, ensuring proper
 * privacy protection and preventing unauthorized session management across user
 * boundaries.
 */
export async function test_api_session_deletion_cross_user_attempt(
  connection: api.IConnection,
) {
  // Create first user account with session
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: "SecurePassword123",
      name: RandomGenerator.name(),
      href: "https://localhost:3000/",
      referrer: "https://localhost:3000/",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user1);

  // Store user1's session token for later reference
  const user1Token = user1.token;

  // Create second user account to test cross-user session deletion
  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: "DifferentPassword456",
      name: RandomGenerator.name(),
      href: "https://localhost:3000/",
      referrer: "https://localhost:3000/",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user2);

  // Store user2's session token for reference
  const user2Token = user2.token;

  // Verify both users have different IDs
  TestValidator.notEquals(
    "users should have different IDs",
    user1.id,
    user2.id,
  );
  TestValidator.notEquals(
    "users should have different emails",
    user1.email,
    user2.email,
  );

  // Verify both users have valid JWT tokens
  TestValidator.predicate(
    "user1 should have valid token",
    user1Token.access.length > 0,
  );
  TestValidator.predicate(
    "user2 should have valid token",
    user2Token.access.length > 0,
  );

  // User1 attempts to delete user2's session (should fail due to ownership validation)
  await TestValidator.error(
    "user1 should not be able to delete user2's session",
    async () => {
      await api.functional.todoApp.user.users.sessions.erase(connection, {
        userId: user2.id,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // User2 attempts to delete user1's session (should fail due to ownership validation)
  await TestValidator.error(
    "user2 should not be able to delete user1's session",
    async () => {
      await api.functional.todoApp.user.users.sessions.erase(connection, {
        userId: user1.id,
        sessionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
