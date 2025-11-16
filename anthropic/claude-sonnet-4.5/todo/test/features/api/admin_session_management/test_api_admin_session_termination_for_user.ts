import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test admin-initiated session termination for user accounts.
 *
 * This test validates that an administrator can successfully delete a user's
 * authentication session. The scenario demonstrates the security workflow where
 * admins can forcibly terminate user sessions for security or administrative
 * reasons.
 *
 * Note: This test uses simulation mode since we cannot retrieve actual session
 * IDs from the available API endpoints. In a real environment, you would first
 * query the user's active sessions before deleting one.
 *
 * Steps:
 *
 * 1. Create and authenticate an admin account
 * 2. Create a regular user account
 * 3. Admin deletes a user session (simulated with generated IDs)
 * 4. Verify the deleted session data structure is valid
 */
export async function test_api_admin_session_termination_for_user(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create regular user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: "userPassword123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 3: Admin deletes user's session
  // Using generated UUIDs since we cannot retrieve actual session IDs from available endpoints
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const deletedSession: ITodoListUserSession =
    await api.functional.todoList.admin.users.sessions.erase(connection, {
      userId: user.id,
      sessionId: sessionId,
    });

  // Step 4: Validate the deleted session data structure
  typia.assert(deletedSession);

  // Verify session belongs to the correct user
  TestValidator.equals(
    "deleted session belongs to the correct user",
    deletedSession.todo_list_user_id,
    user.id,
  );

  // Verify session ID matches
  TestValidator.equals(
    "deleted session ID matches requested session",
    deletedSession.id,
    sessionId,
  );
}
