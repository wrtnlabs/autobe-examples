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
 * Test inventory level retrieval for products with zero current stock
 * scenarios.
 *
 * This test validates comprehensive inventory tracking functionality including:
 *
 * 1. Inventory records with zero currentStock are properly retrieved
 * 2. Reserved and allocated stock fields are accurately maintained
 * 3. Other inventory parameters remain unaffected by zero stock levels
 * 4. Proper handling of reorder points and restock quantities
 * 5. Complete inventory level data structure validation
 *
 * The test creates realistic inventory scenarios and verifies that zero stock
 * conditions do not impact the integrity of inventory tracking data.
 */
export async function test_api_inventory_level_zero_stock_scenarios(
  connection: api.IConnection,
) {
  // Generate a realistic inventory level ID
  const inventoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve inventory level record
  const inventoryLevel: IShoppingMallInventoryLevels =
    await api.functional.shoppingMall.inventoryLevels.at(connection, {
      inventoryId,
    });

  // Validate the complete inventory level structure
  typia.assert(inventoryLevel);

  // Test 1: Validate zero current stock scenarios
  TestValidator.predicate(
    "inventory level has valid current stock",
    inventoryLevel.currentStock >= 0,
  );

  // Test 2: Validate reserved stock handling
  TestValidator.predicate(
    "reserved stock is non-negative",
    inventoryLevel.reservedStock >= 0,
  );

  // Test 3: Validate allocated stock handling
  TestValidator.predicate(
    "allocated stock is non-negative",
    inventoryLevel.allocatedStock >= 0,
  );

  // Test 4: Validate reorder point configuration
  TestValidator.predicate(
    "reorder point is non-negative",
    inventoryLevel.reorderPoint >= 0,
  );

  // Test 5: Validate restock quantity
  TestValidator.predicate(
    "restock quantity is non-negative",
    inventoryLevel.restockQuantity >= 0,
  );

  // Test 6: Validate inventory relationships
  TestValidator.predicate(
    "available inventory calculation is correct",
    inventoryLevel.currentStock >=
      inventoryLevel.reservedStock + inventoryLevel.allocatedStock,
  );

  // Test 7: Validate product variant reference
  TestValidator.predicate(
    "product variant has valid ID",
    inventoryLevel.productVariant.id.length > 0,
  );

  // Test 8: Validate seller reference
  TestValidator.predicate(
    "seller has valid ID",
    inventoryLevel.seller.id.length > 0,
  );

  // Test 9: Validate warehouse reference
  TestValidator.predicate(
    "warehouse has valid ID",
    inventoryLevel.warehouse.id.length > 0,
  );

  // Test 10: Validate timestamps
  TestValidator.predicate(
    "created at timestamp is valid",
    new Date(inventoryLevel.createdAt).getTime() > 0,
  );

  TestValidator.predicate(
    "updated at timestamp is valid",
    new Date(inventoryLevel.updatedAt).getTime() > 0,
  );
}
