import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";

/**
 * Test filtering platform commission records by creation date range using
 * created_after and created_before parameters.
 *
 * This test validates time-based commission reporting critical for financial
 * period analysis and revenue tracking. Administrators need to retrieve
 * commission records for specific accounting periods (monthly, quarterly,
 * annually) to support financial reporting workflows and revenue trend
 * analysis.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to access commission financial data
 * 2. Define a specific date range for filtering (e.g., 30-day window)
 * 3. Submit search request with created_after and created_before parameters
 * 4. Validate all returned records have created_at timestamps within the specified
 *    range
 * 5. Verify pagination functions correctly with date filtering applied
 * 6. Confirm records outside the date range are properly excluded
 * 7. Ensure accurate total record counts for the filtered time period
 * 8. Verify date-based sorting maintains chronological order
 */
export async function test_api_platform_commission_filter_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
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

  // Step 2: Define test date range (30-day window ending now)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const created_after = thirtyDaysAgo.toISOString();
  const created_before = now.toISOString();

  // Step 3: Execute search request with date range parameters
  const commissionPage =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          created_after: created_after,
          created_before: created_before,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(commissionPage);

  // Step 4: Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    commissionPage.pagination.current >= 1 &&
      commissionPage.pagination.limit >= 1 &&
      commissionPage.pagination.records >= 0 &&
      commissionPage.pagination.pages >= 0,
  );

  // Step 5: Validate all returned records are within date range
  for (const commission of commissionPage.data) {
    const createdAt = new Date(commission.created_at);
    const afterDate = new Date(created_after);
    const beforeDate = new Date(created_before);

    TestValidator.predicate(
      "commission created_at should be within specified date range",
      createdAt >= afterDate && createdAt <= beforeDate,
    );
  }

  // Step 6: Test with different date range to verify filtering works correctly
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const narrowRangeStart = sevenDaysAgo.toISOString();

  const narrowCommissionPage =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_after: narrowRangeStart,
          created_before: created_before,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(narrowCommissionPage);

  // Step 7: Validate narrow date range filtering
  for (const commission of narrowCommissionPage.data) {
    const createdAt = new Date(commission.created_at);
    const afterDate = new Date(narrowRangeStart);
    const beforeDate = new Date(created_before);

    TestValidator.predicate(
      "commission in narrow range should be within 7-day window",
      createdAt >= afterDate && createdAt <= beforeDate,
    );
  }

  // Step 8: Verify chronological order when sorted by created_at descending
  if (commissionPage.data.length > 1) {
    for (let i = 0; i < commissionPage.data.length - 1; i++) {
      const current = new Date(commissionPage.data[i].created_at);
      const next = new Date(commissionPage.data[i + 1].created_at);

      TestValidator.predicate(
        "commissions should be sorted by created_at in descending order",
        current >= next,
      );
    }
  }
}
