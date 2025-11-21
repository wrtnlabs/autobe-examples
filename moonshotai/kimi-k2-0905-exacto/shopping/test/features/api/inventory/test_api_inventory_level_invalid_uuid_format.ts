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
 * Test API behavior when provided with an inventory ID that does not conform to
 * UUID format. Since TypeScript prevents sending invalid types to API
 * functions, this test validates that the API correctly handles error responses
 * when valid UUID strings reference non-existent inventory records. Tests both
 * properly formatted but non-existent UUIDs and edge cases within the UUID
 * format constraints.
 */
export async function test_api_inventory_level_invalid_uuid_format(
  connection: api.IConnection,
) {
  // Test 1: Valid UUID format but non-existent inventory record
  const nonExistentInventoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "non-existent inventory ID should return appropriate error",
    async () => {
      await api.functional.shoppingMall.inventoryLevels.at(connection, {
        inventoryId: nonExistentInventoryId,
      });
    },
  );

  // Test 2: Another valid UUID format but non-existent inventory record
  const anotherNonExistentId =
    "550e8400-e29b-41d4-a716-446655440000" as string & tags.Format<"uuid">;

  await TestValidator.error(
    "another non-existent inventory ID should return appropriate error",
    async () => {
      await api.functional.shoppingMall.inventoryLevels.at(connection, {
        inventoryId: anotherNonExistentId,
      });
    },
  );

  // Test 3: Zero UUID (special case of valid UUID format)
  const zeroUUID = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;

  await TestValidator.error(
    "zero UUID should return appropriate error",
    async () => {
      await api.functional.shoppingMall.inventoryLevels.at(connection, {
        inventoryId: zeroUUID,
      });
    },
  );
}
