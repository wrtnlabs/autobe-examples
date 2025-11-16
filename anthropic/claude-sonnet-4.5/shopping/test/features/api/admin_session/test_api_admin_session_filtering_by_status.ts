import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";

/**
 * Test filtering admin sessions by their active or expired status for security
 * monitoring.
 *
 * This test validates that administrators can filter session records based on
 * the session status field, distinguishing between currently active sessions
 * (expired_at is null) and terminated sessions (expired_at is set).
 *
 * Test workflow:
 *
 * 1. Create an admin account through join endpoint (automatically creates first
 *    session)
 * 2. Retrieve sessions filtered by status='active'
 * 3. Verify all returned sessions have null expired_at timestamps
 * 4. Validate pagination metadata is correct
 * 5. Confirm the filtering logic works as expected for security monitoring use
 *    cases
 */
export async function test_api_admin_session_filtering_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create admin account (this automatically creates the first active session)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePass123!",
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "moderator",
      email_verified: true,
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com/login",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Query sessions with status='active' filter
  const activeSessions =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 10,
        status: "active",
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(activeSessions);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    activeSessions.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 10",
    activeSessions.pagination.limit === 10,
  );
  TestValidator.predicate(
    "should have at least one active session",
    activeSessions.data.length >= 1,
  );
  TestValidator.predicate(
    "records count should match data length",
    activeSessions.pagination.records === activeSessions.data.length,
  );

  // Step 4: Verify all returned sessions are actually active (expired_at is null)
  for (const session of activeSessions.data) {
    typia.assert(session);
    TestValidator.equals(
      "active session should have null expired_at",
      session.expired_at,
      null,
    );
    TestValidator.equals(
      "session should belong to the created admin",
      session.admin.id,
      admin.id,
    );
  }

  // Step 5: Validate that the join operation created at least one session
  const joinSession = activeSessions.data.find(
    (s) => s.admin.email === adminEmail,
  );
  TestValidator.predicate(
    "should find the session created by join operation",
    joinSession !== undefined,
  );
}
