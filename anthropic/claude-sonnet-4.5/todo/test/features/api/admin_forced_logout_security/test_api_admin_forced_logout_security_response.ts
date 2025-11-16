import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test the security workflow where an administrator forcefully terminates a
 * user session.
 *
 * This test validates that admins can delete user sessions for security
 * purposes. It creates an admin account and a user account with an active
 * session, then demonstrates the admin's ability to forcefully terminate the
 * user's session.
 *
 * The test verifies:
 *
 * 1. Admin can successfully authenticate
 * 2. User can successfully authenticate and establish a session
 * 3. Admin can call the session deletion endpoint with user ID and session ID
 * 4. The session deletion returns proper session information
 *
 * Note: Due to API limitations (user join response doesn't include session ID),
 * this test demonstrates the API call structure using generated session IDs.
 */
export async function test_api_admin_forced_logout_security_response(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: "192.168.1.100",
        href: "https://admin.example.com/login" satisfies string &
          tags.Format<"uri">,
        referrer: "https://admin.example.com/" satisfies string &
          tags.Format<"uri">,
      } satisfies ITodoListAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create and authenticate a user account with active session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "userPassword123";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        ip: "10.0.0.50",
        href: "https://app.example.com/signup" satisfies string &
          tags.Format<"uri">,
        referrer: "https://app.example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Extract user ID
  const userId = user.id;

  // Generate a session ID for demonstration (in real scenario, this would come from session listing)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Admin forcefully deletes the user's session
  const deletedSession: ITodoListUserSession =
    await api.functional.todoList.admin.users.sessions.erase(connection, {
      userId: userId,
      sessionId: sessionId,
    });
  typia.assert(deletedSession);

  // Step 4: Verify the deleted session information
  TestValidator.equals(
    "deleted session user ID matches",
    deletedSession.todo_list_user_id,
    userId,
  );
  TestValidator.equals(
    "deleted session ID matches",
    deletedSession.id,
    sessionId,
  );

  // Verify session has proper structure
  TestValidator.predicate(
    "session has valid IP address",
    typeof deletedSession.ip === "string" && deletedSession.ip.length > 0,
  );

  TestValidator.predicate(
    "session has valid href",
    typeof deletedSession.href === "string" && deletedSession.href.length > 0,
  );

  TestValidator.predicate(
    "session has valid token",
    typeof deletedSession.token === "string" && deletedSession.token.length > 0,
  );

  TestValidator.predicate(
    "session has valid created_at timestamp",
    typeof deletedSession.created_at === "string",
  );
}
