import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRevenueStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRevenueStatistics";

/**
 * Test revenue statistics with various date range boundaries and edge cases.
 *
 * This test validates that the revenue statistics API correctly handles
 * different date range scenarios including single-day periods, multi-year
 * ranges, and calendar year transitions. It ensures proper inclusive date
 * filtering and validates response structure consistency across all boundary
 * conditions.
 *
 * Test scenarios:
 *
 * 1. Single-day period (start_date === end_date)
 * 2. Multi-year range spanning 3+ years
 * 3. Year-end boundary transition (Dec 31 to Jan 1)
 * 4. Consecutive days (minimal valid range)
 * 5. Validate period dates match request dates
 * 6. Confirm all response fields follow schema constraints
 */
export async function test_api_revenue_statistics_date_range_boundaries(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
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

  // 2. Test single-day period
  const singleDayStats =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: {
          start_date: "2024-06-15",
          end_date: "2024-06-15",
        } satisfies IShoppingMallRevenueStatistics.IRequest,
      },
    );
  typia.assert(singleDayStats);
  TestValidator.equals(
    "single day start date matches",
    singleDayStats.period_start_date.substring(0, 10),
    "2024-06-15",
  );
  TestValidator.equals(
    "single day end date matches",
    singleDayStats.period_end_date.substring(0, 10),
    "2024-06-15",
  );

  // 3. Test multi-year range (3 years)
  const multiYearStats =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: {
          start_date: "2021-01-01",
          end_date: "2024-12-31",
        } satisfies IShoppingMallRevenueStatistics.IRequest,
      },
    );
  typia.assert(multiYearStats);
  TestValidator.equals(
    "multi-year start date matches",
    multiYearStats.period_start_date.substring(0, 10),
    "2021-01-01",
  );
  TestValidator.equals(
    "multi-year end date matches",
    multiYearStats.period_end_date.substring(0, 10),
    "2024-12-31",
  );

  // 4. Test year-end boundary transition
  const yearEndStats =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: {
          start_date: "2023-12-31",
          end_date: "2024-01-01",
        } satisfies IShoppingMallRevenueStatistics.IRequest,
      },
    );
  typia.assert(yearEndStats);
  TestValidator.equals(
    "year-end start date matches",
    yearEndStats.period_start_date.substring(0, 10),
    "2023-12-31",
  );
  TestValidator.equals(
    "year-end end date matches",
    yearEndStats.period_end_date.substring(0, 10),
    "2024-01-01",
  );

  // 5. Test consecutive days
  const consecutiveDaysStats =
    await api.functional.shoppingMall.admin.statistics.revenue.index(
      connection,
      {
        body: {
          start_date: "2024-03-15",
          end_date: "2024-03-16",
        } satisfies IShoppingMallRevenueStatistics.IRequest,
      },
    );
  typia.assert(consecutiveDaysStats);
  TestValidator.equals(
    "consecutive days start date matches",
    consecutiveDaysStats.period_start_date.substring(0, 10),
    "2024-03-15",
  );
  TestValidator.equals(
    "consecutive days end date matches",
    consecutiveDaysStats.period_end_date.substring(0, 10),
    "2024-03-16",
  );
}
