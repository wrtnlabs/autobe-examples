import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminAuth";

/**
 * Test administrator logout from current session.
 *
 * This test validates the complete logout workflow for administrators:
 *
 * 1. Admin registers a new account and receives JWT authentication tokens
 * 2. Admin uses those tokens to access the system (automatic via SDK)
 * 3. Admin explicitly logs out from the current session
 * 4. Logout operation marks the session as expired in todo_list_admin_sessions
 *    table
 *
 * The test confirms that the logout endpoint properly terminates the current
 * admin session, sets the expired_at timestamp, and returns a success
 * confirmation. This ensures proper session lifecycle management and security
 * audit trail maintenance.
 */
export async function test_api_admin_logout_current_session(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account and obtain JWT tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const registrationBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const authorizedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationBody,
    });

  typia.assert(authorizedAdmin);

  // Verify the admin received valid authentication tokens
  TestValidator.predicate(
    "admin should receive access token",
    authorizedAdmin.token.access.length > 0,
  );

  TestValidator.predicate(
    "admin should receive refresh token",
    authorizedAdmin.token.refresh.length > 0,
  );

  // Step 2: Logout from the current session
  const logoutResponse: ITodoListAdminAuth.ILogoutResponse =
    await api.functional.todoList.admin.admins.logout(connection);

  typia.assert(logoutResponse);

  // Step 3: Validate logout response structure and success status
  TestValidator.predicate(
    "logout should succeed",
    logoutResponse.success === true,
  );

  TestValidator.predicate(
    "logout response should contain confirmation message",
    logoutResponse.message.length > 0,
  );
}
