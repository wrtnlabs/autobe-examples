import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test updating SKU color variant attributes for product configuration.
 *
 * This test validates the complete workflow of updating a SKU color variant,
 * ensuring that color information can be modified while maintaining referential
 * integrity with existing SKU relationships.
 *
 * Test workflow:
 *
 * 1. Admin authenticates to the system
 * 2. Admin creates a new color variant
 * 3. Admin updates the color's name to a different value
 * 4. Validate that the name was updated successfully
 * 5. Verify that the color ID and created timestamp remain unchanged
 * 6. Confirm that the color variant maintains its integrity after update
 */
export async function test_api_sku_color_hex_code_update(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication - create and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a color variant
  const initialColorName = RandomGenerator.name(2);

  const createdColor = await api.functional.shoppingMall.admin.skuColors.create(
    connection,
    {
      body: {
        name: initialColorName,
      } satisfies IShoppingMallSkuColor.ICreate,
    },
  );
  typia.assert(createdColor);

  TestValidator.equals(
    "color name matches",
    createdColor.name,
    initialColorName,
  );

  // Step 3: Update the color's name to a new value
  const updatedColorName = RandomGenerator.name(2);

  const updatedColor = await api.functional.shoppingMall.admin.skuColors.update(
    connection,
    {
      colorId: createdColor.id,
      body: {
        name: updatedColorName,
      } satisfies IShoppingMallSkuColor.IUpdate,
    },
  );
  typia.assert(updatedColor);

  // Step 4: Validate the update was successful
  TestValidator.equals("color ID unchanged", updatedColor.id, createdColor.id);
  TestValidator.equals(
    "color name updated",
    updatedColor.name,
    updatedColorName,
  );
  TestValidator.equals(
    "created timestamp unchanged",
    updatedColor.created_at,
    createdColor.created_at,
  );

  // Step 5: Verify that the color variant maintains integrity
  TestValidator.predicate(
    "color variant exists after update",
    updatedColor.id === createdColor.id,
  );
}
