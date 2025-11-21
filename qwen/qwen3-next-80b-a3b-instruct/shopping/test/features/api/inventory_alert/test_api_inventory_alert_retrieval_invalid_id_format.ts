import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAlert";

export async function test_api_inventory_alert_retrieval_invalid_id_format(
  connection: api.IConnection,
) {
  // Test that the system rejects invalid alertId formats (non-UUID)
  await TestValidator.error(
    "invalid alertId format should return 400 Bad Request",
    async () => {
      await api.functional.shoppingMall.inventory.alerts.at(connection, {
        alertId: "invalid-format", // Invalid non-UUID format
      });
    },
  );

  // Test with empty string
  await TestValidator.error(
    "empty alertId should return 400 Bad Request",
    async () => {
      await api.functional.shoppingMall.inventory.alerts.at(connection, {
        alertId: "", // Empty string is invalid
      });
    },
  );

  // Test with spaces
  await TestValidator.error(
    "alertId with spaces should return 400 Bad Request",
    async () => {
      await api.functional.shoppingMall.inventory.alerts.at(connection, {
        alertId: "   ", // Whitespace only is invalid
      });
    },
  );

  // Test with a valid UUID to verify system works with correct format
  const validAlertId = typia.random<string & tags.Format<"uuid">>();
  const alert: IShoppingMallInventoryAlert =
    await api.functional.shoppingMall.inventory.alerts.at(connection, {
      alertId: validAlertId,
    });
  typia.assert(alert);
}
