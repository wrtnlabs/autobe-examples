import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAlert";

export async function test_api_inventory_alert_retrieval_missing_path_parameter(
  connection: api.IConnection,
) {
  // Test that the system returns a 404 Not Found error when an invalid alertId is provided
  // This scenario tests the system's response when the required alertId path parameter is either empty
  // or malformed, which simulates the behavior of a missing path parameter in the URL

  // Since the API SDK requires the alertId parameter to be provided (due to TypeScript type safety),
  // we test the equivalent intent by using an empty string as alertId, which will cause the server to return a 404
  // because no inventory alert exists with an empty ID

  // The routing system should reject incomplete paths (e.g. /shoppingMall/inventory/alerts/),
  // and return 404 Not Found when alertId is missing or invalid

  // Example: The server is expected to return 404 when alertId is empty string
  await TestValidator.error(
    "invalid alertId (empty string) should return 404 Not Found",
    async () => {
      await api.functional.shoppingMall.inventory.alerts.at(connection, {
        alertId: "", // Invalid value simulating missing path parameter
      });
    },
  );
}
