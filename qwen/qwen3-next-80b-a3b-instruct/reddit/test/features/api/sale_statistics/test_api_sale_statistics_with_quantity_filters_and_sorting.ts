import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleViewStat";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleViewStat";
export async function test_api_sale_statistics_with_quantity_filters_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Configure request with minimum quantity filter and revenue sorting
  const request: ICommunityPlatformSaleViewStat.IRequest = {
    min_quantity: 10,
    sort_by: "total_revenue",
    sort_order: "desc",
    sales_status: "completed",
    period_granularity: "month",
  };
  // Call the API to get aggregated statistics
  const response: IPageICommunityPlatformSaleViewStat =
    await api.functional.communityPlatform.saleviewstats.index(connection, {
      body: request,
    });
  // Validate response structure matches schema
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records > 0",
    () => response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages > 0",
    () => response.pagination.pages > 0,
  );
  // Validate data array exists and contains items
  TestValidator.predicate(
    "response data has entries",
    () => response.data.length > 0,
  );
  // Validate each statistics entry has required fields
  for (const stat of response.data) {
    TestValidator.predicate(
      "category exists and is string",
      () => typeof stat.category === "string" && stat.category.length > 0,
    );
    TestValidator.predicate(
      "totalSales is positive integer",
      () => typeof stat.totalSales === "number" && stat.totalSales > 0,
    );
    TestValidator.predicate(
      "totalRevenue is positive number",
      () => typeof stat.totalRevenue === "number" && stat.totalRevenue > 0,
    );
    TestValidator.predicate(
      "averageSale is positive number",
      () => typeof stat.averageSale === "number" && stat.averageSale > 0,
    );
    TestValidator.predicate(
      "uniqueProductsSold is positive integer",
      () =>
        typeof stat.uniqueProductsSold === "number" &&
        stat.uniqueProductsSold > 0,
    );
    TestValidator.predicate("period is valid ISO date-time", () =>
      typia.is<string & tags.Format<"date-time">>(stat.period),
    );
  }
  // Validate that results are properly sorted by total_revenue in descending order
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    TestValidator.predicate(
      "results sorted by total_revenue descending",
      () => current.totalRevenue >= next.totalRevenue,
    );
  }
}
