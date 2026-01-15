import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformShipment";
export async function test_api_shipment_cost_breakdown_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Fetch the cost breakdown analytics using the provided connection
  const costBreakdown: IPageICommunityPlatformShipment.ICostBreakdown =
    await api.functional.communityPlatform.analytics.shipments.cost_breakdown.index(
      connection,
    );
  // Validate the response structure and types using typia.assert - this is the ONLY validation needed
  typia.assert(costBreakdown);
  // Validate pagination constraints that are part of the business contract
  TestValidator.equals(
    "current page should be 1",
    costBreakdown.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be at least 1",
    costBreakdown.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "total records should be at least 0",
    costBreakdown.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be at least 1",
    costBreakdown.pagination.pages >= 1,
  );
}
