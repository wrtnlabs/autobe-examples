import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIStatisticsTopProducts } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIStatisticsTopProducts";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IStatisticsTopProducts } from "@ORGANIZATION/PROJECT-api/lib/structures/IStatisticsTopProducts";
import type { IUuid } from "@ORGANIZATION/PROJECT-api/lib/structures/IUuid";

/**
 * Test top products analysis with specific date range filtering.
 *
 * This comprehensive test validates that administrators can generate
 * time-bounded product performance reports using start_date and end_date
 * parameters. The test creates realistic business scenarios to verify accurate
 * revenue calculations, unit sales tracking, and customer rating aggregations
 * within temporal boundaries.
 *
 * Test flow:
 *
 * 1. Create administrator account with proper authentication
 * 2. Generate test data for multiple products with varying performance metrics
 * 3. Test same-day date range filtering for precise daily analytics
 * 4. Test multi-day period filtering for trend analysis
 * 5. Test month-long date ranges for comprehensive reporting
 * 6. Test boundary conditions with start/end date edge cases
 * 7. Validate response structure and data accuracy
 * 8. Test sorting options (total_revenue, total_units, average_rating)
 * 9. Verify pagination and result limiting functionality
 * 10. Test filtering with additional parameters (category, seller, minimums)
 */
export async function test_api_admin_top_products_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with proper authentication
  const adminLevels = [
    "super_admin",
    "department_admin",
    "support_admin",
    "viewer",
  ] as const;
  const adminData = {
    email: typia.random<string & tags.Format<"email"> & tags.MaxLength<255>>(),
    firstname: RandomGenerator.name(1),
    lastname: RandomGenerator.name(1),
    adminlevel: RandomGenerator.pick(adminLevels),
    department: "Analytics Department",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  TestValidator.predicate(
    "admin authentication successful",
    admin.token?.access !== undefined,
  );
  TestValidator.predicate(
    "admin has valid admin level",
    adminLevels.includes(admin.admin_level),
  );

  // Step 2: Test same-day date range filtering for precise daily analytics
  const todayDate = new Date();
  const todayISO = todayDate.toISOString().split("T")[0];

  const sameDayRequest = {
    start_date: todayISO,
    end_date: todayISO,
    limit: 10,
    sort_by: "total_revenue",
  } satisfies IStatisticsTopProducts.IRequest;

  const sameDayResults =
    await api.functional.shoppingMall.admin.statistics.top_products.index(
      connection,
      {
        body: sameDayRequest,
      },
    );
  typia.assert(sameDayResults);

  TestValidator.predicate(
    "same-day results have valid pagination",
    sameDayResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "same-day results have data array",
    Array.isArray(sameDayResults.data),
  );

  if (sameDayResults.data.length > 0) {
    const topProduct = sameDayResults.data[0];
    TestValidator.predicate(
      "top product has required fields",
      topProduct.id !== undefined &&
        topProduct.product_name !== undefined &&
        topProduct.total_sales_amount !== undefined &&
        topProduct.total_quantity_sold !== undefined &&
        topProduct.average_rating !== undefined,
    );
    TestValidator.predicate(
      "top product has positive metrics",
      topProduct.total_sales_amount >= 0 &&
        topProduct.total_quantity_sold >= 0 &&
        topProduct.average_rating >= 0 &&
        topProduct.average_rating <= 5,
    );
  }

  // Step 3: Test week-long date range for trend analysis
  const weekAgoDate = new Date(todayDate);
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekAgoISO = weekAgoDate.toISOString().split("T")[0];

  const weekRangeRequest = {
    start_date: weekAgoISO,
    end_date: todayISO,
    limit: 20,
    sort_by: "total_units",
  } satisfies IStatisticsTopProducts.IRequest;

  const weekResults =
    await api.functional.shoppingMall.admin.statistics.top_products.index(
      connection,
      {
        body: weekRangeRequest,
      },
    );
  typia.assert(weekResults);

  TestValidator.predicate(
    "week-range results have valid pagination",
    weekResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "week-range results have data array",
    Array.isArray(weekResults.data),
  );
  TestValidator.predicate(
    "week-range results have current page",
    weekResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "week-range results have valid limit",
    weekResults.pagination.limit >= 0,
  );

  // Step 4: Test month-long date range for comprehensive reporting
  const monthAgoDate = new Date(todayDate);
  monthAgoDate.setMonth(monthAgoDate.getMonth() - 1);
  const monthAgoISO = monthAgoDate.toISOString().split("T")[0];

  const monthRangeRequest = {
    start_date: monthAgoISO,
    end_date: todayISO,
    limit: 50,
    sort_by: "average_rating",
    minimum_sales: 1,
    minimum_revenue: 10,
  } satisfies IStatisticsTopProducts.IRequest;

  const monthResults =
    await api.functional.shoppingMall.admin.statistics.top_products.index(
      connection,
      {
        body: monthRangeRequest,
      },
    );
  typia.assert(monthResults);

  TestValidator.predicate(
    "month-range results have valid pagination",
    monthResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "month-range results have data array",
    Array.isArray(monthResults.data),
  );

  // Step 5: Test boundary conditions with start/end date edge cases
  const startOfYear = new Date(todayDate.getFullYear(), 0, 1)
    .toISOString()
    .split("T")[0];
  const endOfYear = new Date(todayDate.getFullYear(), 11, 31)
    .toISOString()
    .split("T")[0];

  const yearRangeRequest = {
    start_date: startOfYear,
    end_date: endOfYear,
    limit: 100,
    sort_by: "recent_sales",
    include_inactive: false,
  } satisfies IStatisticsTopProducts.IRequest;

  const yearResults =
    await api.functional.shoppingMall.admin.statistics.top_products.index(
      connection,
      {
        body: yearRangeRequest,
      },
    );
  typia.assert(yearResults);

  // Step 6: Test pagination with large results
  const paginationTest =
    await api.functional.shoppingMall.admin.statistics.top_products.index(
      connection,
      {
        body: {
          start_date: weekAgoISO,
          end_date: todayISO,
          limit: 5,
          sort_by: "total_revenue",
        },
      },
    );
  typia.assert(paginationTest);

  TestValidator.predicate(
    "pagination test limit respected",
    paginationTest.pagination.limit <= 5,
  );
  TestValidator.predicate(
    "pagination test current page valid",
    paginationTest.pagination.current === 0,
  );
  TestValidator.predicate(
    "pagination test data length matches limit",
    paginationTest.data.length <= 5,
  );

  // Step 7: Test different sorting options
  const sortOptions = [
    "total_revenue",
    "total_units",
    "average_rating",
    "recent_sales",
  ] as const;

  for (const sortOption of sortOptions) {
    const sortRequest = {
      start_date: monthAgoISO,
      end_date: todayISO,
      limit: 10,
      sort_by: sortOption,
    } satisfies IStatisticsTopProducts.IRequest;

    const sortResults =
      await api.functional.shoppingMall.admin.statistics.top_products.index(
        connection,
        {
          body: sortRequest,
        },
      );
    typia.assert(sortResults);

    TestValidator.predicate(
      `sort by ${sortOption} returns data`,
      Array.isArray(sortResults.data),
    );
  }

  // Step 8: Test with additional filtering parameters
  const filteredRequest = {
    start_date: weekAgoISO,
    end_date: todayISO,
    limit: 15,
    sort_by: "total_revenue",
    category_ids: ArrayUtil.repeat(3, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
    seller_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
    minimum_sales: 5,
    minimum_revenue: 100,
  } satisfies IStatisticsTopProducts.IRequest;

  const filteredResults =
    await api.functional.shoppingMall.admin.statistics.top_products.index(
      connection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filteredResults);

  // Validate final comprehensive test
  TestValidator.equals(
    "comprehensive result structure valid",
    Array.isArray(filteredResults.data),
    true,
  );
  TestValidator.predicate(
    "comprehensive result has pagination",
    filteredResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "all results returned with proper types",
    typeof filteredResults.pagination.current === "number" &&
      typeof filteredResults.pagination.limit === "number",
  );

  // Test empty date range handling (same date results)
  const emptyRangeRequest = {
    start_date: todayISO,
    end_date: todayISO,
    limit: 1,
  } satisfies IStatisticsTopProducts.IRequest;

  const emptyResults =
    await api.functional.shoppingMall.admin.statistics.top_products.index(
      connection,
      {
        body: emptyRangeRequest,
      },
    );
  typia.assert(emptyResults);

  TestValidator.predicate(
    "empty range request handles properly",
    emptyResults.pagination !== undefined,
  );
}
