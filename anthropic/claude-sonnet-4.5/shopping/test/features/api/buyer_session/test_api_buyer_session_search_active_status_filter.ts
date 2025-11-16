import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBuyerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerSession";

/**
 * Test administrator's ability to filter buyer sessions by active status.
 *
 * This test validates session status-based filtering functionality for active
 * session monitoring. It verifies that administrators can accurately filter
 * buyer sessions using the is_active parameter to retrieve active sessions, and
 * that the filtering mechanism works correctly.
 *
 * Test Flow:
 *
 * 1. Create and authenticate admin account for session monitoring
 * 2. Create buyer account and generate multiple active sessions through login
 * 3. Filter for active sessions (is_active: true) - validate only active sessions
 *    returned
 * 4. Filter for expired sessions (is_active: false) - validate filtering works
 *    (may be empty)
 * 5. Search without filter - validate all sessions returned regardless of status
 * 6. Verify pagination and data consistency across different filter states
 */
export async function test_api_buyer_session_search_active_status_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = typia.random<string & tags.MinLength<8>>();
  const buyer = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallBuyer.ICreate,
  });
  typia.assert(buyer);

  // Step 3: Generate multiple buyer sessions through login
  const sessionCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  await ArrayUtil.asyncRepeat(sessionCount, async () => {
    const loginResult = await api.functional.auth.buyer.login(connection, {
      body: {
        email: buyerEmail,
        password: buyerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ILogin,
    });
    typia.assert(loginResult);
  });

  // Step 4: Search for active sessions (is_active: true)
  const activeSessionsResult =
    await api.functional.shoppingMall.admin.buyers.sessions.index(connection, {
      buyerId: buyer.id,
      body: {
        page: 1,
        limit: 100,
        is_active: true,
      } satisfies IShoppingMallBuyerSession.IRequest,
    });
  typia.assert(activeSessionsResult);

  // Validate active sessions exist and all have null expired_at
  TestValidator.predicate(
    "active sessions should exist after login",
    activeSessionsResult.data.length > 0,
  );

  activeSessionsResult.data.forEach((session) => {
    TestValidator.equals(
      "active session expired_at should be null",
      session.expired_at,
      null,
    );
  });

  // Step 5: Search for expired sessions (is_active: false)
  const expiredSessionsResult =
    await api.functional.shoppingMall.admin.buyers.sessions.index(connection, {
      buyerId: buyer.id,
      body: {
        page: 1,
        limit: 100,
        is_active: false,
      } satisfies IShoppingMallBuyerSession.IRequest,
    });
  typia.assert(expiredSessionsResult);

  // Validate expired sessions - if any exist, they should have non-null expired_at
  if (expiredSessionsResult.data.length > 0) {
    expiredSessionsResult.data.forEach((session) => {
      TestValidator.predicate(
        "expired session should have non-null expired_at timestamp",
        session.expired_at !== null && session.expired_at !== undefined,
      );
    });
  }

  // Step 6: Search without filter - should return all sessions
  const allSessionsResult =
    await api.functional.shoppingMall.admin.buyers.sessions.index(connection, {
      buyerId: buyer.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallBuyerSession.IRequest,
    });
  typia.assert(allSessionsResult);

  // Validate that total sessions include at least the active sessions
  TestValidator.predicate(
    "total sessions should include all active sessions",
    allSessionsResult.data.length >= activeSessionsResult.data.length,
  );

  // Validate pagination consistency
  TestValidator.predicate(
    "total records should equal active plus expired sessions",
    allSessionsResult.pagination.records ===
      activeSessionsResult.pagination.records +
        expiredSessionsResult.pagination.records,
  );

  // Validate that filtering works correctly by comparing counts
  TestValidator.predicate(
    "active sessions count should match filter result",
    activeSessionsResult.pagination.records > 0,
  );
}
