import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test color variant consolidation workflow where admin standardizes similar
 * colors.
 *
 * This test validates the uniqueness constraint enforcement on SKU color names
 * when an administrator attempts to consolidate similar color variants. The
 * scenario simulates a real-world admin workflow where duplicate or
 * near-duplicate color definitions need to be standardized to maintain clean
 * taxonomy.
 *
 * Workflow steps:
 *
 * 1. Admin authentication - Establishes admin session with proper credentials
 * 2. Create first color variant - Establishes the canonical color name
 * 3. Create second color variant - Creates a similar color with different name
 * 4. Attempt consolidation update - Try to rename second color to match first
 * 5. Validate error response - Ensure uniqueness constraint prevents duplicate
 *
 * This test ensures data integrity by verifying that the system properly
 * rejects attempts to create duplicate color names, which would confuse
 * customers and create inconsistent product variant definitions across the
 * catalog.
 */
export async function test_api_sku_color_consolidation_workflow(
  connection: api.IConnection,
) {
  // Step 1: Admin authentication
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

  // Step 2: Create first color variant
  const firstColorName = RandomGenerator.name(2);
  const firstColor = await api.functional.shoppingMall.admin.skuColors.create(
    connection,
    {
      body: {
        name: firstColorName,
      } satisfies IShoppingMallSkuColor.ICreate,
    },
  );
  typia.assert(firstColor);
  TestValidator.equals(
    "first color name matches",
    firstColor.name,
    firstColorName,
  );

  // Step 3: Create second color variant with similar but different name
  const secondColorName = RandomGenerator.name(2);
  const secondColor = await api.functional.shoppingMall.admin.skuColors.create(
    connection,
    {
      body: {
        name: secondColorName,
      } satisfies IShoppingMallSkuColor.ICreate,
    },
  );
  typia.assert(secondColor);
  TestValidator.equals(
    "second color name matches",
    secondColor.name,
    secondColorName,
  );
  TestValidator.notEquals(
    "colors have different IDs",
    firstColor.id,
    secondColor.id,
  );

  // Step 4: Attempt to update second color to match first color name (should fail)
  await TestValidator.error(
    "updating color to duplicate name should fail",
    async () => {
      await api.functional.shoppingMall.admin.skuColors.update(connection, {
        colorId: secondColor.id,
        body: {
          name: firstColorName,
        } satisfies IShoppingMallSkuColor.IUpdate,
      });
    },
  );
}
