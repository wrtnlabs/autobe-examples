import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IOrderItemDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IOrderItemDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
export async function test_api_order_items_analytics_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Determine date range for testing - last 30 days
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Step 2: Create request body with date range filter
  const requestBody: IShoppingMallOrderItem.IRequest = {
    limit: 100,
    offset: 0,
    searchTerm: "",
    sortBy: "createdAt",
    sortOrder: "desc",
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    },
  };
  // Step 3: Call the analytics endpoint
  const response: IPageIShoppingMallOrderItem =
    await api.functional.shoppingMall.analytics.order_items.index(connection, {
      body: requestBody,
    });
  // Step 4: Validate response structure
  typia.assert(response);
  // Step 5: Verify we got data in the date range
  // The response.data array should contain order items within the specified date range
  const itemsInDateRange = response.data.filter((item) => {
    const itemDate = new Date(item.created_at);
    return itemDate >= startDate && itemDate <= endDate;
  });
  // Validate that we have items returned in the date range
  TestValidator.predicate(
    "at least one item in date range",
    itemsInDateRange.length > 0,
  );
}
