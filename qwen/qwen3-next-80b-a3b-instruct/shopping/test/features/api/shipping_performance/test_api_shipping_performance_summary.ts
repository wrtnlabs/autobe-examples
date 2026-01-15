import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallShippingPerformance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformance";
export async function test_api_shipping_performance_summary(
  connection: api.IConnection,
): Promise<void> {
  // Call the shipping performance analytics endpoint
  const performanceSummary: IShoppingMallShippingPerformance.ISummary =
    await api.functional.shoppingMall.analytics.shipping.performance.index(
      connection,
    );
  // Validate the complete response structure with typia.assert() for perfect type safety
  // typia.assert() validates EVERY aspect: types, formats, ranges, required fields, and nested structures
  typia.assert(performanceSummary);
}
