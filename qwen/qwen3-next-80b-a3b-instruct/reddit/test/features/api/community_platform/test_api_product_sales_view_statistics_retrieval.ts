import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleViewStat";
export async function test_api_product_sales_view_statistics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product code that matches the format expected by the API
  const productCode = typia.random<string & tags.Format<"uuid">>();
  // Call the API endpoint to retrieve sales statistics for the generated product code
  const stats: ICommunityPlatformSaleViewStat =
    await api.functional.communityPlatform.saleviewstats.at(connection, {
      productCode,
    });
  // Validate that the response structure matches ICommunityPlatformSaleViewStat
  typia.assert(stats);
  // Verify all numeric values are positive and within expected ranges
  TestValidator.predicate(
    "total sales count is positive",
    stats.totalSales > 0,
  );
  TestValidator.predicate("total revenue is positive", stats.totalRevenue >= 0);
  TestValidator.predicate(
    "average sale value is positive",
    stats.averageSale >= 0,
  );
  TestValidator.predicate(
    "unique products sold is positive",
    stats.uniqueProductsSold > 0,
  );
  // Validate string format requirements
  TestValidator.predicate(
    "category is a non-empty string",
    stats.category.length > 0,
  );
  TestValidator.predicate(
    "period is a valid date-time format",
    stats.period.startsWith("20") && stats.period.endsWith("Z"),
  );
  // Verify timestamp format compliance
  const periodDate = new Date(stats.period);
  TestValidator.predicate(
    "period is a valid date",
    !isNaN(periodDate.getTime()),
  );
}
