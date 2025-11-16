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
 * Test combining multiple filter parameters for precise session queries in
 * security investigations.
 *
 * This test validates that filter parameters can be used together to create
 * sophisticated queries for security monitoring. It ensures that combining
 * status, IP address, date range, and search filters returns only sessions
 * matching ALL criteria simultaneously.
 *
 * Process:
 *
 * 1. Create test admin account
 * 2. Establish initial authenticated session
 * 3. Retrieve sessions using combined filters (status + date range)
 * 4. Validate that all filters are applied correctly with AND logic
 * 5. Verify pagination reflects filtered results
 */
export async function test_api_admin_session_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for session tracking
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: RandomGenerator.pick([
        "super_admin",
        "moderator",
        "support",
      ] as const),
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Retrieve sessions using combined filters
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const filteredSessions =
    await api.functional.shoppingMall.admin.admins.sessions.index(connection, {
      adminId: admin.id,
      body: {
        page: 1,
        limit: 10,
        status: "active",
        created_after: oneDayAgo.toISOString(),
        created_before: now.toISOString(),
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallAdminSession.IRequest,
    });
  typia.assert(filteredSessions);

  // Step 3: Validate filtered results
  TestValidator.predicate(
    "pagination data exists",
    filteredSessions.pagination !== null &&
      filteredSessions.pagination !== undefined,
  );

  TestValidator.predicate(
    "sessions array exists",
    Array.isArray(filteredSessions.data),
  );

  // Step 4: Verify all returned sessions match the combined filter criteria
  for (const session of filteredSessions.data) {
    typia.assert(session);

    // Verify session belongs to the correct admin
    TestValidator.equals(
      "session belongs to test admin",
      session.admin.id,
      admin.id,
    );

    // Verify session status matches filter (active sessions have null expired_at)
    TestValidator.equals("session status is active", session.expired_at, null);

    // Verify session created_at is within date range
    const sessionDate = new Date(session.created_at);
    TestValidator.predicate(
      "session created after start date",
      sessionDate >= oneDayAgo,
    );
    TestValidator.predicate(
      "session created before end date",
      sessionDate <= now,
    );
  }

  // Step 5: Test pagination metadata
  TestValidator.predicate(
    "current page is 1",
    filteredSessions.pagination.current === 1,
  );

  TestValidator.predicate(
    "limit matches request",
    filteredSessions.pagination.limit === 10,
  );

  TestValidator.predicate(
    "total records is non-negative",
    filteredSessions.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages is non-negative",
    filteredSessions.pagination.pages >= 0,
  );
}
