import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test admin session revocation by session ID.
 *
 * This test validates that an authenticated admin can revoke a specific session
 * using its session ID. Since no login endpoint is available in the provided
 * APIs, this test creates an admin account (which automatically creates a
 * session) and tests the revocation of that session.
 *
 * Test flow:
 *
 * 1. Create a new admin account (automatically creates first session)
 * 2. Retrieve the active sessions list to get session IDs
 * 3. Verify that at least one session exists
 * 4. Revoke the session by its ID
 * 5. Verify the revocation was successful
 */
export async function test_api_admin_session_revocation_by_session_id(
  connection: api.IConnection,
) {
  // Step 1: Create a new admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Retrieve active sessions list
  const sessionsList =
    await api.functional.auth.admin.sessions.listSessions(connection);
  typia.assert(sessionsList);

  // Step 3: Verify at least one session exists
  TestValidator.predicate(
    "at least one session should exist after admin creation",
    sessionsList.sessions.length > 0,
  );

  TestValidator.predicate(
    "total_count should match sessions array length",
    sessionsList.total_count === sessionsList.sessions.length,
  );

  // Step 4: Get the first session ID to revoke
  const sessionToRevoke = sessionsList.sessions[0];
  typia.assert(sessionToRevoke);

  // Step 5: Revoke the session
  const revokeResponse = await api.functional.auth.admin.sessions.revokeSession(
    connection,
    {
      sessionId: sessionToRevoke.id,
    },
  );
  typia.assert(revokeResponse);
}
