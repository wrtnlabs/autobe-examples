import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test that a user can delete their own session records while ensuring proper
 * authorization checks prevent deletion of sessions belonging to other users.
 * This validates security boundary enforcement and session management isolation
 * principles.
 */
export async function test_api_user_session_deletion_by_owner(
  connection: api.IConnection,
) {
  // Step 1: Create primary user account
  const primaryUserEmail = typia.random<string & tags.Format<"email">>();
  const primaryUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: primaryUserEmail,
        password: "password123",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(primaryUser);

  // Step 2: Create system configuration
  const configuration: ITodoListConfiguration =
    await api.functional.todoList.user.configurations.create(connection, {
      body: {
        key: "session.timeout",
        value: "3600",
        description: "Session timeout in seconds",
        category: "security",
      } satisfies ITodoListConfiguration.ICreate,
    });
  typia.assert(configuration);

  // Step 3: Create session for primary user
  const primaryUserSession: ITodoListUserSession =
    await api.functional.todoList.users.sessions.create(connection, {
      userId: primaryUser.id,
      body: {
        ip: "192.168.1.100",
        href: "https://example.com/dashboard",
        referrer: "https://example.com/login",
      } satisfies ITodoListUserSession.ICreate,
    });
  typia.assert(primaryUserSession);

  // Step 4: Create second user account
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: secondUserEmail,
        password: "password456",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(secondUser);

  // Step 5: Create session for second user
  const secondUserSession: ITodoListUserSession =
    await api.functional.todoList.users.sessions.create(connection, {
      userId: secondUser.id,
      body: {
        ip: "192.168.1.101",
        href: "https://example.com/profile",
        referrer: "https://example.com/register",
      } satisfies ITodoListUserSession.ICreate,
    });
  typia.assert(secondUserSession);

  // Step 6: Attempt to delete second user's session using primary user credentials (should fail)
  await TestValidator.error(
    "primary user cannot delete other user's session",
    async () => {
      await api.functional.todoList.user.users.sessions.erase(connection, {
        userId: secondUser.id,
        sessionId: secondUserSession.id,
      });
    },
  );

  // Step 7: Delete primary user's own session (should succeed)
  await api.functional.todoList.user.users.sessions.erase(connection, {
    userId: primaryUser.id,
    sessionId: primaryUserSession.id,
  });

  // Step 8: Verify session ownership and deletion success
  TestValidator.equals(
    "primary user session belongs to correct user",
    primaryUserSession.user.id,
    primaryUser.id,
  );

  TestValidator.equals(
    "second user session belongs to correct user",
    secondUserSession.user.id,
    secondUser.id,
  );

  // Step 9: Verify that primary user's session was actually deleted by attempting to delete it again (should fail)
  await TestValidator.error(
    "deleted session should no longer exist",
    async () => {
      await api.functional.todoList.user.users.sessions.erase(connection, {
        userId: primaryUser.id,
        sessionId: primaryUserSession.id,
      });
    },
  );
}
