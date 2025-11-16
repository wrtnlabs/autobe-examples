import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";

/**
 * Test the admin capability to retrieve user session details for security
 * monitoring.
 *
 * This test validates that an administrator can successfully retrieve session
 * information for a user account. Since session IDs are not exposed in the
 * available API responses, this test creates the necessary accounts and
 * demonstrates the session retrieval workflow with a simulated session lookup
 * scenario.
 *
 * Workflow:
 *
 * 1. Create a user account (automatically generates initial session)
 * 2. Create an admin account for session inspection capabilities
 * 3. Simulate session retrieval using admin privileges
 * 4. Validate the session data structure and security-relevant fields
 *
 * Note: This test uses typia.random() to generate session data matching the
 * expected schema since the actual session ID is not available from the user
 * creation response.
 */
export async function test_api_user_session_admin_verification_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create user account and generate initial session
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "userPassword123";
  const userHref = typia.random<string & tags.Format<"uri">>();
  const userReferrer = typia.random<string & tags.Format<"uri">>();

  const userCreateBody = {
    email: userEmail,
    password: userPassword,
    ip: "192.168.1.100",
    href: userHref,
    referrer: userReferrer,
  } satisfies ITodoListUser.ICreate;

  const createdUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(createdUser);

  const userId = createdUser.id;

  // Step 2: Create admin account for session inspection
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();

  const adminCreateBody = {
    email: adminEmail,
    password: adminPassword,
    ip: "192.168.1.200",
    href: adminHref,
    referrer: adminReferrer,
  } satisfies ITodoListAdmin.ICreate;

  const createdAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(createdAdmin);

  // Step 3: Generate a session ID for testing the retrieval endpoint
  // Note: In a real scenario, this would come from a session listing API
  // or be extracted from authentication responses
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Admin retrieves user session details
  // This demonstrates the admin's ability to inspect user sessions
  const session: ITodoListUserSession =
    await api.functional.todoList.admin.users.sessions.at(connection, {
      userId: userId,
      sessionId: sessionId,
    });
  typia.assert(session);

  // Step 5: Validate key session data relationships
  TestValidator.equals(
    "session belongs to correct user",
    session.todo_list_user_id,
    userId,
  );

  TestValidator.equals(
    "session user summary matches created user email",
    session.user.email,
    userEmail,
  );

  TestValidator.equals("session is active", session.expired_at, null);
}
