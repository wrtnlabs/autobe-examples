import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallInventoryLevels } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLevels";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWarehouse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWarehouse";

export async function test_api_inventory_level_nonexistent_record(
  connection: api.IConnection,
) {
  // Generate a random UUID for a non-existent inventory record
  const nonExistentInventoryId = typia.random<string & tags.Format<"uuid">>();

  // Test that the API throws an error when retrieving non-existent inventory level
  await TestValidator.error(
    "API should throw error for non-existent inventory ID",
    async () => {
      await api.functional.shoppingMall.inventoryLevels.at(connection, {
        inventoryId: nonExistentInventoryId,
      });
    },
  );
}
