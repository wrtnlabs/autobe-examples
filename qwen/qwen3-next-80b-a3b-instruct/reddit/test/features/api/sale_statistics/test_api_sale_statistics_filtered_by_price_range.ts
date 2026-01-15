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
export async function test_api_sale_statistics_filtered_by_price_range(
  connection: api.IConnection,
): Promise<void> {
  // Create request body with min_price=50 and max_price=200 as specified in scenario
  const requestBody: ICommunityPlatformSaleViewStat.IRequest = {
    min_price: 50,
    max_price: 200,
    sales_status: "completed",
    sort_by: "total_revenue",
    sort_order: "desc",
    period_granularity: "month",
  } satisfies ICommunityPlatformSaleViewStat.IRequest;
  // Call the API endpoint with the request body
  const response: IPageICommunityPlatformSaleViewStat =
    await api.functional.communityPlatform.saleviewstats.index(connection, {
      body: requestBody,
    });
  // Validate the response structure and type
  typia.assert(response);
  // Verify that the response has data
  TestValidator.predicate(
    "response should contain data",
    response.data.length > 0,
  );
  // For each statistics record, verify the data is consistent
  for (const stat of response.data) {
    // Verify required properties exist and have valid values
    TestValidator.predicate(
      "category should be a non-empty string",
      stat.category !== undefined &&
        typeof stat.category === "string" &&
        stat.category.length > 0,
    );
    TestValidator.predicate(
      "totalSales should be a positive integer",
      stat.totalSales > 0 && Number.isInteger(stat.totalSales),
    );
    TestValidator.predicate(
      "totalRevenue should be positive",
      stat.totalRevenue > 0,
    );
    TestValidator.predicate(
      "averageSale should be positive",
      stat.averageSale > 0,
    );
    TestValidator.predicate(
      "uniqueProductsSold should be a positive integer",
      stat.uniqueProductsSold > 0 && Number.isInteger(stat.uniqueProductsSold),
    );
    TestValidator.predicate(
      "period should be a valid ISO date-time",
      /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}Z$/.test(stat.period),
    );
  }
  // Verify pagination data
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be at least as large as data length",
    response.pagination.records >= response.data.length,
  );
  TestValidator.predicate(
    "pagination pages should be at least 1",
    response.pagination.pages >= 1,
  );
}
