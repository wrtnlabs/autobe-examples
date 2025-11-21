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
 * Test that retrieved inventory levels include proper warehouse relationship
 * data.
 *
 * This test validates that the warehouse field contains complete warehouse
 * information including id, name, code, location, status, total_capacity, and
 * available_capacity. It verifies warehouse data integrity and proper object
 * structure in the response.
 *
 * Test steps:
 *
 * 1. Generate a random inventory ID
 * 2. Call the inventory levels API endpoint
 * 3. Validate the response structure contains complete warehouse data
 * 4. Verify all warehouse fields are present and properly typed
 * 5. Ensure warehouse data integrity by validating field values
 */
export async function test_api_inventory_level_warehouse_relationship(
  connection: api.IConnection,
) {
  // Generate a random inventory ID for testing
  const inventoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve inventory level data with warehouse relationship
  const inventoryLevel: IShoppingMallInventoryLevels =
    await api.functional.shoppingMall.inventoryLevels.at(connection, {
      inventoryId,
    });

  // Validate the response structure
  typia.assert(inventoryLevel);

  // Validate warehouse relationship data integrity
  TestValidator.predicate(
    "warehouse field exists",
    inventoryLevel.warehouse !== null && inventoryLevel.warehouse !== undefined,
  );

  // Validate warehouse data structure - typia.assert already ensures all required fields exist
  TestValidator.predicate(
    "warehouse has required fields",
    inventoryLevel.warehouse.id !== null &&
      inventoryLevel.warehouse.name !== null &&
      inventoryLevel.warehouse.code !== null &&
      inventoryLevel.warehouse.location !== null &&
      inventoryLevel.warehouse.status !== null,
  );
}
