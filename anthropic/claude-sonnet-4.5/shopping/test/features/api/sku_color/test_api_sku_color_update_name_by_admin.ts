import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test admin ability to update SKU color variant name.
 *
 * This test validates that an authenticated admin can successfully update a SKU
 * color variant's name while maintaining referential integrity and uniqueness
 * constraints. The test creates an initial color with a name, then updates it
 * to a corrected or standardized name.
 *
 * Process:
 *
 * 1. Authenticate as admin to obtain authorization
 * 2. Create initial SKU color with original name
 * 3. Update the color name to corrected version
 * 4. Verify updated color reflects new name with same ID
 * 5. Confirm created timestamp is preserved
 */
export async function test_api_sku_color_update_name_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create initial SKU color with original name
  const originalColorName = "Navy Bleu";
  const createdColor: IShoppingMallSkuColor =
    await api.functional.shoppingMall.admin.skuColors.create(connection, {
      body: {
        name: originalColorName,
      } satisfies IShoppingMallSkuColor.ICreate,
    });
  typia.assert(createdColor);

  // Step 3: Update the color name to corrected version
  const correctedColorName = "Navy Blue";
  const updatedColor: IShoppingMallSkuColor =
    await api.functional.shoppingMall.admin.skuColors.update(connection, {
      colorId: createdColor.id,
      body: {
        name: correctedColorName,
      } satisfies IShoppingMallSkuColor.IUpdate,
    });
  typia.assert(updatedColor);

  // Step 4: Verify updated color has new name
  TestValidator.equals(
    "updated color name should match corrected name",
    updatedColor.name,
    correctedColorName,
  );

  // Step 5: Verify color ID remains unchanged
  TestValidator.equals(
    "color ID should remain the same after update",
    updatedColor.id,
    createdColor.id,
  );

  // Step 6: Verify created timestamp is preserved
  TestValidator.equals(
    "created timestamp should be preserved",
    updatedColor.created_at,
    createdColor.created_at,
  );
}
