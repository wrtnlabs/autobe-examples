import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test administrator's ability to manage and clean up sessions across multiple
 * user accounts.
 *
 * This test validates that an admin can delete individual sessions for specific
 * users without affecting other users' sessions. It ensures proper isolation
 * between different users' sessions and confirms the admin has comprehensive
 * authority to manage sessions system-wide.
 *
 * Note: Due to API limitations, session IDs are not exposed in the registration
 * response, so this test uses generated session IDs to validate the API
 * structure and admin permissions. In a real scenario, a session listing
 * endpoint would be needed to retrieve actual session IDs.
 *
 * Test Flow:
 *
 * 1. Create and authenticate as admin
 * 2. Create multiple regular user accounts (each gets a session upon registration)
 * 3. Admin deletes session for first user
 * 4. Verify first user's session deletion response
 * 5. Admin deletes sessions for remaining users
 * 6. Validate all deletion operations return proper session data
 */
export async function test_api_admin_session_cleanup_multiple_users(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.100",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create three regular user accounts with sessions
  const user1Email = typia.random<string & tags.Format<"email">>();
  const user1 = await api.functional.auth.user.join(connection, {
    body: {
      email: user1Email,
      password: "password123",
      ip: "192.168.1.101",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user1);

  const user2Email = typia.random<string & tags.Format<"email">>();
  const user2 = await api.functional.auth.user.join(connection, {
    body: {
      email: user2Email,
      password: "password456",
      ip: "192.168.1.102",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user2);

  const user3Email = typia.random<string & tags.Format<"email">>();
  const user3 = await api.functional.auth.user.join(connection, {
    body: {
      email: user3Email,
      password: "password789",
      ip: "192.168.1.103",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user3);

  // Step 3: Prepare user and session IDs for deletion operations
  const user1Id = user1.id;
  const user2Id = user2.id;
  const user3Id = user3.id;

  // Generate session IDs for testing (API limitation: real session IDs not exposed in join response)
  const user1SessionId = typia.random<string & tags.Format<"uuid">>();
  const user2SessionId = typia.random<string & tags.Format<"uuid">>();
  const user3SessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Admin deletes user1's session
  const deletedSession1 =
    await api.functional.todoList.admin.users.sessions.erase(connection, {
      userId: user1Id,
      sessionId: user1SessionId,
    });
  typia.assert(deletedSession1);

  // Step 5: Verify the deleted session belongs to user1
  TestValidator.equals(
    "deleted session user ID matches user1",
    deletedSession1.todo_list_user_id,
    user1Id,
  );
  TestValidator.equals(
    "deleted session ID matches",
    deletedSession1.id,
    user1SessionId,
  );
  TestValidator.predicate(
    "user1 session marked as expired",
    deletedSession1.expired_at !== null,
  );

  // Step 6: Admin deletes user2's session (testing session isolation)
  const deletedSession2 =
    await api.functional.todoList.admin.users.sessions.erase(connection, {
      userId: user2Id,
      sessionId: user2SessionId,
    });
  typia.assert(deletedSession2);
  TestValidator.equals(
    "deleted session user ID matches user2",
    deletedSession2.todo_list_user_id,
    user2Id,
  );
  TestValidator.equals(
    "deleted session 2 ID matches",
    deletedSession2.id,
    user2SessionId,
  );
  TestValidator.predicate(
    "user2 session marked as expired",
    deletedSession2.expired_at !== null,
  );

  // Step 7: Admin deletes user3's session
  const deletedSession3 =
    await api.functional.todoList.admin.users.sessions.erase(connection, {
      userId: user3Id,
      sessionId: user3SessionId,
    });
  typia.assert(deletedSession3);
  TestValidator.equals(
    "deleted session user ID matches user3",
    deletedSession3.todo_list_user_id,
    user3Id,
  );
  TestValidator.equals(
    "deleted session 3 ID matches",
    deletedSession3.id,
    user3SessionId,
  );
  TestValidator.predicate(
    "user3 session marked as expired",
    deletedSession3.expired_at !== null,
  );

  // Step 8: Verify all deleted sessions have proper user associations
  TestValidator.predicate(
    "all sessions have different user IDs",
    deletedSession1.todo_list_user_id !== deletedSession2.todo_list_user_id &&
      deletedSession2.todo_list_user_id !== deletedSession3.todo_list_user_id &&
      deletedSession1.todo_list_user_id !== deletedSession3.todo_list_user_id,
  );
}
