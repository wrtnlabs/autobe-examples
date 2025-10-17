import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test the complete workflow of deleting an SKU color variant by an admin.
 *
 * This test validates that admins can successfully remove color variants that
 * are not currently in use by any product SKUs. The test ensures referential
 * integrity is maintained by only allowing deletion of unused color variants.
 *
 * Workflow:
 *
 * 1. Create and authenticate as admin
 * 2. Create a new SKU color variant
 * 3. Verify the color variant was created successfully
 * 4. Delete the color variant
 * 5. Verify deletion completed without errors
 */
export async function test_api_sku_color_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as admin
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Create a new SKU color variant
  const colorName = `${RandomGenerator.name()} ${RandomGenerator.pick(["Blue", "Red", "Green", "Yellow", "Purple", "Black", "White"] as const)}`;

  const colorCreateData = {
    name: colorName,
  } satisfies IShoppingMallSkuColor.ICreate;

  const createdColor: IShoppingMallSkuColor =
    await api.functional.shoppingMall.admin.skuColors.create(connection, {
      body: colorCreateData,
    });
  typia.assert(createdColor);

  // Step 3: Verify the color variant was created successfully
  TestValidator.equals("color name matches", createdColor.name, colorName);

  // Step 4: Delete the color variant
  await api.functional.shoppingMall.admin.skuColors.erase(connection, {
    colorId: createdColor.id,
  });

  // Step 5: Deletion completed without errors (void return means success)
}
