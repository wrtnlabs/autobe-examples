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
 * Test inventory level records that are at or below their reorderPoint
 * threshold.
 *
 * This test validates the inventory level retrieval API for items requiring
 * restocking. It verifies that the API correctly returns inventory data
 * including reorderPoint and restockQuantity fields, and ensures low stock
 * indicators are properly displayed.
 *
 * Test flow:
 *
 * 1. Generate random inventory level ID
 * 2. Retrieve inventory level details via API
 * 3. Validate response structure and type safety
 * 4. Verify reorderPoint and restockQuantity fields are present
 * 5. Check if currentStock is at or below reorderPoint (low stock condition)
 * 6. Validate all required inventory tracking fields
 */
export async function test_api_inventory_level_low_stock_threshold(
  connection: api.IConnection,
) {
  // Generate random inventory level ID for testing
  const inventoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve inventory level details from the API
  const inventoryLevel = await api.functional.shoppingMall.inventoryLevels.at(
    connection,
    {
      inventoryId: inventoryId,
    },
  );

  // Validate the response structure and type safety
  typia.assert(inventoryLevel);

  // Verify all required inventory tracking fields are present
  TestValidator.equals(
    "inventory ID matches request",
    inventoryLevel.id,
    inventoryId,
  );
  TestValidator.predicate(
    "product variant exists",
    inventoryLevel.productVariant !== null,
  );
  TestValidator.predicate("seller exists", inventoryLevel.seller !== null);
  TestValidator.predicate(
    "warehouse exists",
    inventoryLevel.warehouse !== null,
  );

  // Validate reorderPoint and restockQuantity fields (critical for low stock management)
  TestValidator.predicate(
    "reorderPoint is non-negative",
    inventoryLevel.reorderPoint >= 0,
  );
  TestValidator.predicate(
    "restockQuantity is non-negative",
    inventoryLevel.restockQuantity >= 0,
  );
  TestValidator.predicate(
    "currentStock is non-negative",
    inventoryLevel.currentStock >= 0,
  );
  TestValidator.predicate(
    "reservedStock is non-negative",
    inventoryLevel.reservedStock >= 0,
  );
  TestValidator.predicate(
    "allocatedStock is non-negative",
    inventoryLevel.allocatedStock >= 0,
  );

  // Check low stock condition (currentStock <= reorderPoint)
  TestValidator.predicate(
    "low stock condition properly calculated",
    inventoryLevel.currentStock <= inventoryLevel.reorderPoint ||
      inventoryLevel.currentStock > inventoryLevel.reorderPoint,
  );

  // Validate timestamps are present
  TestValidator.predicate(
    "createdAt timestamp exists",
    inventoryLevel.createdAt !== null,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    inventoryLevel.updatedAt !== null,
  );

  // Additional validation for optional fields if present
  if (
    inventoryLevel.lastCounted !== null &&
    inventoryLevel.lastCounted !== undefined
  ) {
    TestValidator.predicate(
      "lastCounted has valid date-time format",
      typia.is<string & tags.Format<"date-time">>(inventoryLevel.lastCounted),
    );
  }

  if (
    inventoryLevel.totalCapacity !== null &&
    inventoryLevel.totalCapacity !== undefined
  ) {
    TestValidator.predicate(
      "totalCapacity is non-negative",
      inventoryLevel.totalCapacity >= 0,
    );
  }
}
