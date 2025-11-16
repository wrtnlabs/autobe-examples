import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test date range filtering for seller session searches as admin.
 *
 * This test validates the date range filtering functionality for seller
 * authentication sessions. It creates a seller account which generates an
 * initial session, then authenticates as an admin and tests various date range
 * filtering scenarios:
 *
 * 1. Filter sessions created after a specific date (created_at_after only)
 * 2. Filter sessions created before a specific date (created_at_before only)
 * 3. Filter sessions within a specific time window (both created_at_after and
 *    created_at_before)
 * 4. Filter sessions by expiration date ranges (expired_at_after,
 *    expired_at_before) if applicable
 *
 * Each test verifies that only sessions matching the date range criteria are
 * returned while sessions outside the range are properly excluded. The test
 * also confirms ISO 8601 date-time format handling.
 */
export async function test_api_seller_session_search_by_date_range(
  connection: api.IConnection,
) {
  // Create a seller account to generate initial session
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  const sellerId = seller.id;

  // Create and authenticate as admin to search seller sessions
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
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

  // Get all sessions to understand the available data
  const allSessionsResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: sellerId,
      body: {} satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(allSessionsResult);

  TestValidator.predicate(
    "should have at least one session created",
    allSessionsResult.data.length > 0,
  );

  // Test 1: Filter sessions created after a specific date (created_at_after only)
  const firstSession = allSessionsResult.data[0];
  const pastDate = new Date(
    new Date(firstSession.created_at).getTime() - 1000 * 60 * 60,
  ).toISOString();

  const afterFilterResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: sellerId,
      body: {
        created_at_after: pastDate,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(afterFilterResult);

  TestValidator.predicate(
    "sessions filtered by created_at_after should only include sessions created after the specified date",
    afterFilterResult.data.every((session) => session.created_at >= pastDate),
  );

  // Test 2: Filter sessions created before a specific date (created_at_before only)
  const futureDate = new Date(
    new Date(firstSession.created_at).getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();

  const beforeFilterResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: sellerId,
      body: {
        created_at_before: futureDate,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(beforeFilterResult);

  TestValidator.predicate(
    "sessions filtered by created_at_before should only include sessions created before the specified date",
    beforeFilterResult.data.every(
      (session) => session.created_at <= futureDate,
    ),
  );

  // Test 3: Filter sessions within a specific time window (both parameters)
  const windowStart = new Date(
    new Date(firstSession.created_at).getTime() - 1000 * 60 * 60,
  ).toISOString();
  const windowEnd = new Date(
    new Date(firstSession.created_at).getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();

  const windowFilterResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: sellerId,
      body: {
        created_at_after: windowStart,
        created_at_before: windowEnd,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(windowFilterResult);

  TestValidator.predicate(
    "sessions filtered by time window should only include sessions within the date range",
    windowFilterResult.data.every(
      (session) =>
        session.created_at >= windowStart && session.created_at <= windowEnd,
    ),
  );

  TestValidator.predicate(
    "time window filter should return the session",
    windowFilterResult.data.length > 0,
  );

  // Test 4: Test expired_at filters if there are any expired sessions
  const expiredSessions = allSessionsResult.data.filter(
    (s) => s.expired_at !== null,
  );

  if (expiredSessions.length > 0) {
    const expiredSession = expiredSessions[0];
    typia.assertGuard(expiredSession.expired_at!);

    const expiredAfterResult: IPageIShoppingMallSellerSession.ISummary =
      await api.functional.shoppingMall.admin.sellers.sessions.index(
        connection,
        {
          sellerId: sellerId,
          body: {
            expired_at_after: expiredSession.expired_at,
          } satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    typia.assert(expiredAfterResult);

    TestValidator.predicate(
      "sessions filtered by expired_at_after should only include sessions expired after the specified date",
      expiredAfterResult.data.every(
        (session) =>
          session.expired_at !== null &&
          session.expired_at >= expiredSession.expired_at!,
      ),
    );

    const expiredBeforeDate = new Date(
      new Date(expiredSession.expired_at).getTime() + 1000 * 60 * 60 * 24,
    ).toISOString();

    const expiredBeforeResult: IPageIShoppingMallSellerSession.ISummary =
      await api.functional.shoppingMall.admin.sellers.sessions.index(
        connection,
        {
          sellerId: sellerId,
          body: {
            expired_at_before: expiredBeforeDate,
          } satisfies IShoppingMallSellerSession.IRequest,
        },
      );
    typia.assert(expiredBeforeResult);

    TestValidator.predicate(
      "sessions filtered by expired_at_before should only include sessions expired before the specified date",
      expiredBeforeResult.data.every(
        (session) =>
          session.expired_at !== null &&
          session.expired_at <= expiredBeforeDate,
      ),
    );
  }

  // Test 5: Verify ISO 8601 format handling
  const now = new Date();
  const futureISODate = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString();

  const isoFormatResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: sellerId,
      body: {
        created_at_before: futureISODate,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(isoFormatResult);

  TestValidator.predicate(
    "ISO 8601 date-time format should be properly handled",
    isoFormatResult.data.length > 0,
  );

  // Test 6: Verify that date range excludes sessions outside the range
  const veryOldDate = new Date(
    new Date(firstSession.created_at).getTime() - 1000 * 60 * 60 * 24 * 365,
  ).toISOString();
  const veryOldDateEnd = new Date(
    new Date(firstSession.created_at).getTime() - 1000 * 60 * 60 * 24 * 364,
  ).toISOString();

  const emptyRangeResult: IPageIShoppingMallSellerSession.ISummary =
    await api.functional.shoppingMall.admin.sellers.sessions.index(connection, {
      sellerId: sellerId,
      body: {
        created_at_after: veryOldDate,
        created_at_before: veryOldDateEnd,
      } satisfies IShoppingMallSellerSession.IRequest,
    });
  typia.assert(emptyRangeResult);

  TestValidator.predicate(
    "date range that excludes all sessions should return empty results",
    emptyRangeResult.data.length === 0,
  );
}
