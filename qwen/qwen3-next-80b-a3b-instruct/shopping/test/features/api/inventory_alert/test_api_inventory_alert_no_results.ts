import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryAlert";
import type { IShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAlert";

export async function test_api_inventory_alert_no_results(
  connection: api.IConnection,
) {
  // Use a deliberately non-existent seller_id that follows UUID format but will never be used in production
  const nonExistentSellerId = "00000000-0000-0000-0000-000000000000";

  // Create a future date range that excludes all possible alerts
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 10,
  ).toISOString(); // 10 years in the future

  // Build the request body with search criteria that should find no results
  const request: IShoppingMallInventoryAlert.IRequest = {
    seller_id: nonExistentSellerId,
    alerted_at_from: futureDate,
    alerted_at_to: futureDate,
  } satisfies IShoppingMallInventoryAlert.IRequest;

  // Call the endpoint with search parameters that should return no results
  const response: IPageIShoppingMallInventoryAlert =
    await api.functional.shoppingMall.inventory.alerts.index(connection, {
      body: request,
    });

  // Validate the response structure
  typia.assert(response);

  // Verify that the data array is empty (no alerts match criteria)
  TestValidator.equals("no alerts should be returned", response.data.length, 0);

  // Verify pagination details are correct for empty result set
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 1 even when empty",
    response.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match default",
    response.pagination.limit,
    10,
  );
}
