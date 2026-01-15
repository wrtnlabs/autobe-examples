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
export async function test_api_sale_statistics_aggregation_by_month(
  connection: api.IConnection,
): Promise<void> {
  // Create request body with required properties as specified in schema
  const requestBody = {
    period_granularity: "month", // Required: month granularity as default
    sales_status: "completed", // Required: completed status as default
    sort_by: "created_at", // Required: default sort_by field
    sort_order: "desc", // Required: default sort_order direction
  } satisfies ICommunityPlatformSaleViewStat.IRequest;
  // Call the API endpoint
  const result: IPageICommunityPlatformSaleViewStat =
    await api.functional.communityPlatform.saleviewstats.index(connection, {
      body: requestBody,
    });
  // Validate response structure and types with typia.assert
  typia.assert(result);
}