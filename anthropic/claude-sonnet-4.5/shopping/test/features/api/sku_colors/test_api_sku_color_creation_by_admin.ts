import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test complete SKU color variant creation workflow by admin.
 *
 * This test validates the end-to-end process of creating a new SKU color
 * variant in the shopping mall platform. SKU colors are reusable attribute
 * entities that maintain consistent color taxonomy across the marketplace.
 *
 * Test workflow:
 *
 * 1. Create and authenticate an admin account to obtain authorization
 * 2. Generate realistic color name data for the new SKU color variant
 * 3. Create a new SKU color by calling the admin color creation endpoint
 * 4. Validate the response contains all required fields with proper types
 * 5. Verify the color is immediately available with correct data
 */
export async function test_api_sku_color_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateData = {
    email: adminEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const authenticatedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });

  typia.assert(authenticatedAdmin);
  TestValidator.equals(
    "authenticated admin email matches",
    authenticatedAdmin.email,
    adminEmail,
  );

  // Step 2: Generate realistic color name for SKU color variant
  const colorNames = [
    "Navy Blue",
    "Forest Green",
    "Crimson Red",
    "Pearl White",
    "Charcoal Gray",
    "Royal Purple",
    "Sunset Orange",
    "Midnight Black",
  ] as const;

  const colorName = RandomGenerator.pick(colorNames);

  // Step 3: Create new SKU color variant
  const colorCreateData = {
    name: colorName,
  } satisfies IShoppingMallSkuColor.ICreate;

  const createdColor: IShoppingMallSkuColor =
    await api.functional.shoppingMall.admin.skuColors.create(connection, {
      body: colorCreateData,
    });

  // Step 4: Validate the created color response
  typia.assert(createdColor);

  // Step 5: Verify color name matches input
  TestValidator.equals(
    "created color name matches input",
    createdColor.name,
    colorName,
  );
}
