import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListAdminAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdminAuth";

/**
 * Test that an administrator can successfully terminate all active sessions
 * using global logout.
 *
 * This scenario validates the global logout security feature where an admin can
 * revoke access to their account by terminating all active sessions. Since we
 * only have the registration endpoint available (no separate login endpoint),
 * this test validates the core functionality:
 *
 * Test Steps:
 *
 * 1. Register a new admin account (automatically creates first session with JWT
 *    tokens)
 * 2. Execute the global logout operation to terminate all sessions
 * 3. Verify the response indicates the session was terminated successfully
 * 4. Confirm that the previously valid access token is now rejected
 * 5. Register a new session and validate that fresh authentication works
 * 6. Perform a second global logout to verify the feature works consistently
 */
export async function test_api_admin_global_logout_all_sessions(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin account (creates first session automatically)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const registrationBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const initialSession = await api.functional.auth.admin.join(connection, {
    body: registrationBody,
  });
  typia.assert(initialSession);

  // Verify the initial session has valid token structure
  TestValidator.predicate(
    "initial session should have access token",
    initialSession.token.access.length > 0,
  );

  TestValidator.predicate(
    "initial session should have refresh token",
    initialSession.token.refresh.length > 0,
  );

  // Store the access token to test invalidation later
  const firstAccessToken = initialSession.token.access;

  // Step 2: Execute the global logout operation
  // The connection already has the Authorization header set from the join() call
  const logoutResponse =
    await api.functional.todoList.admin.admins._logout.all.logoutAll(
      connection,
    );
  typia.assert(logoutResponse);

  // Step 3: Verify the global logout response
  TestValidator.equals(
    "logout operation should be successful",
    logoutResponse.success,
    true,
  );

  TestValidator.predicate(
    "should have terminated at least one session",
    logoutResponse.sessions_terminated >= 1,
  );

  TestValidator.predicate(
    "response message should be non-empty",
    logoutResponse.message.length > 0,
  );

  // Step 4: Verify that the previously valid access token is now rejected
  // Create a new connection with the old (invalidated) access token
  const connectionWithOldToken: api.IConnection = {
    ...connection,
    headers: {
      Authorization: firstAccessToken,
    },
  };

  // Attempt to call the logout endpoint again with the invalidated token
  // This should fail because the token is no longer valid
  await TestValidator.error(
    "invalidated access token should be rejected",
    async () => {
      await api.functional.todoList.admin.admins._logout.all.logoutAll(
        connectionWithOldToken,
      );
    },
  );

  // Step 5: Verify that fresh authentication is required and works
  // Register again with a different email to create a fresh session
  const freshAdminEmail = typia.random<string & tags.Format<"email">>();
  const freshAdminPassword = typia.random<string & tags.MinLength<8>>();

  const freshRegistrationBody = {
    email: freshAdminEmail,
    password: freshAdminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  const freshSession = await api.functional.auth.admin.join(connection, {
    body: freshRegistrationBody,
  });
  typia.assert(freshSession);

  // Verify the fresh session has valid tokens
  TestValidator.predicate(
    "fresh session should have valid access token",
    freshSession.token.access.length > 0,
  );

  TestValidator.predicate(
    "fresh session should have valid refresh token",
    freshSession.token.refresh.length > 0,
  );

  // The fresh token should be different from the old invalidated token
  TestValidator.notEquals(
    "fresh access token should be different from invalidated token",
    freshSession.token.access,
    firstAccessToken,
  );

  // Step 6: Verify the fresh token works by calling the logout endpoint
  // The connection already has the fresh Authorization header set from the second join() call
  const secondLogoutResponse =
    await api.functional.todoList.admin.admins._logout.all.logoutAll(
      connection,
    );
  typia.assert(secondLogoutResponse);

  // This should succeed and terminate the fresh session
  TestValidator.equals(
    "second logout should be successful",
    secondLogoutResponse.success,
    true,
  );

  TestValidator.predicate(
    "second logout should terminate at least one session",
    secondLogoutResponse.sessions_terminated >= 1,
  );
}
