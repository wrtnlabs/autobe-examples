import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAlert";

export async function test_api_inventory_alert_retrieval_non_existent_id(
  connection: api.IConnection,
) {
  // Generate a random UUID that definitely doesn't exist in the system
  const nonExistentAlertId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve a non-existent inventory alert
  await TestValidator.error(
    "retrieving non-existent alert should return 404 error",
    async () => {
      await api.functional.shoppingMall.inventory.alerts.at(connection, {
        alertId: nonExistentAlertId,
      });
    },
  );
}
