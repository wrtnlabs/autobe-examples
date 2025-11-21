import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test error handling when attempting to retrieve a product snapshot with a
 * non-existent product code. Validates that the API returns appropriate error
 * response for invalid product identifiers and maintains proper error messaging
 * standards for resource not found scenarios.
 */
export async function test_api_product_snapshot_nonexistent_product_code(
  connection: api.IConnection,
) {
  // Generate random, non-existent product code
  const nonExistentProductCode = RandomGenerator.alphaNumeric(10);
  const nonExistentSnapshotId = typia.random<string & tags.Format<"uuid">>();

  // Test that API correctly handles non-existent product code
  await TestValidator.error(
    "should return error for non-existent product snapshot",
    async () => {
      await api.functional.shoppingMall.products.snapshots.atSnapshot(
        connection,
        {
          productCode: nonExistentProductCode,
          snapshotId: nonExistentSnapshotId,
        },
      );
    },
  );

  // Generate another random product code to test consistent error handling
  const anotherNonExistentProductCode = RandomGenerator.alphaNumeric(12);
  const anotherNonExistentSnapshotId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Test consistent error handling for multiple non-existent combinations
  await TestValidator.error(
    "should consistently return error for different non-existent product codes",
    async () => {
      await api.functional.shoppingMall.products.snapshots.atSnapshot(
        connection,
        {
          productCode: anotherNonExistentProductCode,
          snapshotId: anotherNonExistentSnapshotId,
        },
      );
    },
  );

  // Test with empty product code to validate input sanitization
  const emptyProductCode = "";
  const validSnapshotId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return error for empty product code",
    async () => {
      await api.functional.shoppingMall.products.snapshots.atSnapshot(
        connection,
        {
          productCode: emptyProductCode,
          snapshotId: validSnapshotId,
        },
      );
    },
  );

  // Test with special characters in product code
  const specialProductCode = "PROD-TEST!@#$%";
  const specialSnapshotId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "should return error for product code with special characters",
    async () => {
      await api.functional.shoppingMall.products.snapshots.atSnapshot(
        connection,
        {
          productCode: specialProductCode,
          snapshotId: specialSnapshotId,
        },
      );
    },
  );
}
