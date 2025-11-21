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
 * Test inventory level capacity planning data retrieval and validation.
 *
 * This test comprehensively validates the inventory levels API endpoint by:
 *
 * 1. Retrieving a specific inventory level record using a valid UUID
 * 2. Validating the complete inventory data structure including stock levels
 * 3. Verifying capacity planning fields (totalCapacity, reorderPoint,
 *    restockQuantity)
 * 4. Validating relationships to product variants, sellers, and warehouses
 * 5. Testing optional field handling and data accuracy
 * 6. Ensuring proper timestamps and inventory state tracking
 *
 * The test focuses on capacity-related data accuracy and validates that
 * reorderPoint and restockQuantity contain meaningful values for inventory
 * management decisions, while properly handling optional fields like
 * totalCapacity.
 */
export async function test_api_inventory_level_capacity_planning_data(
  connection: api.IConnection,
) {
  // Generate a valid inventory ID for testing
  const inventoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve inventory level data
  const inventoryLevel = await api.functional.shoppingMall.inventoryLevels.at(
    connection,
    {
      inventoryId: inventoryId,
    },
  );

  // Validate the complete inventory level structure
  typia.assert(inventoryLevel);

  // Validate core inventory tracking fields
  TestValidator.equals("inventory ID matches", inventoryLevel.id, inventoryId);
  TestValidator.predicate(
    "current stock is non-negative",
    inventoryLevel.currentStock >= 0,
  );
  TestValidator.predicate(
    "reserved stock is non-negative",
    inventoryLevel.reservedStock >= 0,
  );
  TestValidator.predicate(
    "allocated stock is non-negative",
    inventoryLevel.allocatedStock >= 0,
  );

  // Validate capacity planning data
  TestValidator.predicate(
    "reorder point is non-negative",
    inventoryLevel.reorderPoint >= 0,
  );
  TestValidator.predicate(
    "restock quantity is non-negative",
    inventoryLevel.restockQuantity >= 0,
  );

  // Handle optional totalCapacity field with proper type narrowing
  if (inventoryLevel.totalCapacity !== undefined) {
    TestValidator.predicate(
      "total capacity is positive when present",
      inventoryLevel.totalCapacity > 0,
    );
    TestValidator.predicate(
      "current stock does not exceed total capacity",
      inventoryLevel.currentStock <= inventoryLevel.totalCapacity,
    );
  }

  // Validate logical inventory relationships
  TestValidator.predicate(
    "available stock calculation is correct",
    inventoryLevel.currentStock >=
      inventoryLevel.reservedStock + inventoryLevel.allocatedStock,
  );

  // Validate reorder logic for inventory management decisions
  TestValidator.predicate(
    "restock quantity is meaningful for business",
    inventoryLevel.restockQuantity > 0,
  );
  TestValidator.predicate(
    "reorder point suggests restocking need",
    inventoryLevel.reorderPoint <= inventoryLevel.currentStock,
  );

  // Validate timestamp relationships
  TestValidator.predicate(
    "updatedAt is after or equal to createdAt",
    inventoryLevel.updatedAt >= inventoryLevel.createdAt,
  );

  // Handle optional lastCounted field
  if (inventoryLevel.lastCounted !== undefined) {
    TestValidator.predicate(
      "lastCounted is after createdAt",
      inventoryLevel.lastCounted >= inventoryLevel.createdAt,
    );
    TestValidator.predicate(
      "lastCounted is before or equal to updatedAt",
      inventoryLevel.lastCounted <= inventoryLevel.updatedAt,
    );
  }

  // Validate inventory management decision fields have meaningful values
  TestValidator.predicate(
    "reorderPoint has meaningful business value",
    inventoryLevel.reorderPoint > 0,
  );
  TestValidator.predicate(
    "restockQuantity has meaningful business value",
    inventoryLevel.restockQuantity > 0,
  );

  // Validate related entity summaries - these are already validated by typia.assert
  // but we can verify business relationships
  TestValidator.predicate(
    "product variant has valid ID",
    inventoryLevel.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "seller has valid business name",
    inventoryLevel.seller.business_name.length > 0,
  );
  TestValidator.predicate(
    "warehouse has valid location",
    inventoryLevel.warehouse.location.length > 0,
  );

  // Additional capacity planning validation for meaningful business scenarios
  if (inventoryLevel.totalCapacity !== undefined) {
    // Validate capacity utilization for inventory management decisions
    const capacityUtilization =
      (inventoryLevel.currentStock / inventoryLevel.totalCapacity) * 100;
    TestValidator.predicate(
      "capacity utilization percentage is reasonable",
      capacityUtilization >= 0 && capacityUtilization <= 100,
    );

    // Validate that reorder point considers practical capacity constraints
    TestValidator.predicate(
      "reorder point is practical for capacity planning",
      inventoryLevel.reorderPoint <= inventoryLevel.totalCapacity * 0.9,
    ); // Reasonable threshold
  }

  // Validate inventory state consistency for business operations
  TestValidator.predicate(
    "inventory state supports business operations",
    inventoryLevel.currentStock >= 0 &&
      inventoryLevel.reservedStock >= 0 &&
      inventoryLevel.allocatedStock >= 0 &&
      inventoryLevel.currentStock >=
        inventoryLevel.reservedStock + inventoryLevel.allocatedStock,
  );

  // Test meaningful reorder scenarios
  if (inventoryLevel.currentStock <= inventoryLevel.reorderPoint) {
    TestValidator.predicate(
      "reorder quantity is sufficient for restocking",
      inventoryLevel.restockQuantity >= inventoryLevel.reorderPoint,
    );
  }
}
