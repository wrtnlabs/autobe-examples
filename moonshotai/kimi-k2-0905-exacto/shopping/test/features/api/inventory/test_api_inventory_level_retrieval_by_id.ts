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
 * Test successful retrieval of a specific inventory level record by its unique
 * identifier.
 *
 * This test validates the complete inventory retrieval functionality, ensuring
 * the API returns comprehensive inventory information with all required fields
 * populated correctly. The test generates a random inventory ID and retrieves
 * the complete inventory record, validating that all inventory management
 * parameters are present and properly structured through typia validation.
 */
export async function test_api_inventory_level_retrieval_by_id(
  connection: api.IConnection,
) {
  // Generate a random inventory ID using correct type constraints
  const inventoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the inventory level record with proper await and parameter structure
  const inventoryLevel: IShoppingMallInventoryLevels =
    await api.functional.shoppingMall.inventoryLevels.at(connection, {
      inventoryId,
    });

  // Validate the complete response structure using typia - this performs all validation
  typia.assert(inventoryLevel);

  // No additional type validation is needed as typia.assert() validates everything
  // The response is guaranteed to have all required fields with correct types
}
