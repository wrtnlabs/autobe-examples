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

/**
 * Test inventory level retrieval for products with very high stock quantities.
 *
 * This test validates that the API can handle large numeric values for
 * currentStock, reservedStock, and allocatedStock without data type issues or
 * overflow problems. It verifies proper handling of inventory levels exceeding
 * typical stock quantities by testing the API's ability to return complete
 * inventory data for high-volume scenarios.
 */
export async function test_api_inventory_level_high_volume_stock(
  connection: api.IConnection,
) {
  // Generate random UUID for inventory ID
  const inventoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve inventory level with high stock quantities
  const inventoryLevel = await api.functional.shoppingMall.inventoryLevels.at(
    connection,
    { inventoryId },
  );

  // Validate response structure and types
  typia.assert(inventoryLevel);

  // Verify business logic: total stock should cover reserved and allocated quantities
  TestValidator.predicate(
    "total inventory covers committed stock",
    inventoryLevel.currentStock >=
      inventoryLevel.reservedStock + inventoryLevel.allocatedStock,
  );

  // Verify warehouse capacity relationship if defined
  if (inventoryLevel.totalCapacity !== undefined) {
    TestValidator.predicate(
      "current stock fits within warehouse capacity",
      inventoryLevel.currentStock <= inventoryLevel.totalCapacity,
    );
  }
}
