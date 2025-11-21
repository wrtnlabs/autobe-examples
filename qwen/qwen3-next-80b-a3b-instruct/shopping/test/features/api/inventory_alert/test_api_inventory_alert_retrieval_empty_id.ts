import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAlert";

export async function test_api_inventory_alert_retrieval_empty_id(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "empty alertId should return 400 Bad Request",
    async () => {
      await api.functional.shoppingMall.inventory.alerts.at(connection, {
        alertId: "",
      });
    },
  );
}
