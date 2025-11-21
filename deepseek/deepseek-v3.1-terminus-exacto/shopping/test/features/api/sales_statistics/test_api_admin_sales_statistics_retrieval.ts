import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleStatistics";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategorySalesSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySalesSummary";
import type { IShoppingMallDailySalesData } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDailySalesData";
import type { IShoppingMallSaleFilters } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFilters";
import type { IShoppingMallSaleStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleStatistics";
import type { IShoppingMallSaleStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleStatus";
import type { IShoppingMallSalesGroupingDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesGroupingDimension";
import type { IShoppingMallSalesMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesMetric";
import type { IShoppingMallSalesTrend } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesTrend";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Comprehensive E2E test for sales statistics retrieval functionality.
 *
 * Validates that administrators can access aggregated sales data with various
 * filtering options including date ranges, grouping dimensions, and performance
 * metrics. Ensures proper authorization checks and data accuracy for business
 * intelligence reporting.
 */
export async function test_api_admin_sales_statistics_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "super_admin",
      permissions: JSON.stringify({
        sales_statistics: true,
        view_all_sellers: true,
        financial_reports: true,
      }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Test sales statistics with basic date range
  const oneMonthAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const today = new Date().toISOString();

  const basicStats =
    await api.functional.shoppingMall.admin.statistics.sales.index(connection, {
      body: {
        date_range: {
          start: oneMonthAgo,
          end: today,
        } satisfies IDateRange,
        group_by: ["day", "seller"] as IShoppingMallSalesGroupingDimension[],
        metrics: [
          "total_sales",
          "average_sale",
          "commission_earned",
        ] as IShoppingMallSalesMetric[],
        pagination: {
          current: 1,
          limit: 50,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies IShoppingMallSaleStatistics.IRequest,
    });
  typia.assert(basicStats);

  // Validate pagination structure
  TestValidator.predicate(
    "pagination has valid current page",
    basicStats.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    basicStats.pagination.limit >= 0,
  );

  // Step 3: Test with specific filters
  const filteredStats =
    await api.functional.shoppingMall.admin.statistics.sales.index(connection, {
      body: {
        date_range: {
          start: oneMonthAgo,
        } satisfies IDateRange,
        group_by: [
          "category",
          "status",
        ] as IShoppingMallSalesGroupingDimension[],
        filters: {
          sale_status: ["completed", "pending"] as IShoppingMallSaleStatus[],
          min_amount: 100,
          max_amount: 10000,
        } satisfies IShoppingMallSaleFilters,
        metrics: [
          "sale_count",
          "net_amount",
          "item_count",
        ] as IShoppingMallSalesMetric[],
      } satisfies IShoppingMallSaleStatistics.IRequest,
    });
  typia.assert(filteredStats);

  // Step 4: Test with comprehensive grouping
  const comprehensiveStats =
    await api.functional.shoppingMall.admin.statistics.sales.index(connection, {
      body: {
        date_range: {
          end: today,
        } satisfies IDateRange,
        group_by: [
          "month",
          "customer",
          "product",
        ] as IShoppingMallSalesGroupingDimension[],
        metrics: [
          "total_sales",
          "average_sale",
          "commission_earned",
          "item_count",
          "net_amount",
          "sale_count",
        ] as IShoppingMallSalesMetric[],
        pagination: {
          current: 1,
          limit: 100,
          records: 0,
          pages: 0,
        } satisfies IPage.IPagination,
      } satisfies IShoppingMallSaleStatistics.IRequest,
    });
  typia.assert(comprehensiveStats);

  // Validate data structure for each statistics entry
  if (comprehensiveStats.data.length > 0) {
    const sampleStat = comprehensiveStats.data[0];
    TestValidator.predicate(
      "total sales is non-negative number",
      sampleStat.total_sales >= 0,
    );
    TestValidator.predicate(
      "total revenue is non-negative number",
      sampleStat.total_revenue >= 0,
    );
    TestValidator.predicate(
      "average order value is non-negative number",
      sampleStat.average_order_value >= 0,
    );
    TestValidator.predicate(
      "commission earned is non-negative number",
      sampleStat.commission_earned >= 0,
    );
    TestValidator.predicate(
      "net payout is non-negative number",
      sampleStat.net_payout >= 0,
    );

    // Validate seller information structure
    TestValidator.predicate(
      "seller business name is valid string",
      sampleStat.seller.business_name.length > 0,
    );
    TestValidator.predicate(
      "seller contact person is valid string",
      sampleStat.seller.contact_person.length > 0,
    );
    TestValidator.predicate(
      "seller email contains @ symbol",
      sampleStat.seller.email.includes("@"),
    );
    TestValidator.predicate(
      "seller status is valid string",
      sampleStat.seller.status.length > 0,
    );

    // Validate business logic relationships
    if (sampleStat.total_sales > 0) {
      TestValidator.predicate(
        "average order value is reasonable",
        sampleStat.average_order_value <= sampleStat.total_revenue,
      );
      TestValidator.predicate(
        "commission is reasonable percentage of revenue",
        sampleStat.commission_earned <= sampleStat.total_revenue,
      );
      TestValidator.predicate(
        "net payout equals revenue minus commission",
        Math.abs(
          sampleStat.net_payout -
            (sampleStat.total_revenue - sampleStat.commission_earned),
        ) < 0.01,
      );
    }
  }

  // Step 5: Test business logic error - empty metrics array
  await TestValidator.error("should reject empty metrics array", async () => {
    await api.functional.shoppingMall.admin.statistics.sales.index(connection, {
      body: {
        date_range: {
          start: oneMonthAgo,
          end: today,
        } satisfies IDateRange,
        group_by: ["day"] as IShoppingMallSalesGroupingDimension[],
        metrics: [] as IShoppingMallSalesMetric[],
      } satisfies IShoppingMallSaleStatistics.IRequest,
    });
  });
}
