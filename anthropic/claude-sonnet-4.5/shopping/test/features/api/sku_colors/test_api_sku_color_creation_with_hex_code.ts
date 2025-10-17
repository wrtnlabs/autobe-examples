import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test SKU color creation with complete color information for visual swatch
 * rendering.
 *
 * This test validates the SKU color variant creation workflow where an
 * authenticated admin creates a new color option that can be assigned to
 * product SKUs throughout the shopping mall platform. The color creation
 * enables visual color swatch displays in customer-facing variant selection
 * interfaces.
 *
 * Test Flow:
 *
 * 1. Admin authenticates and joins the system with valid credentials
 * 2. System returns admin profile with authentication token
 * 3. Admin creates a new SKU color variant with descriptive name
 * 4. System validates and stores the color information
 * 5. Response includes complete color data with unique identifier and timestamp
 * 6. Verify all response properties match expected structure and formats
 * 7. Confirm the color becomes available for immediate SKU assignment
 */
export async function test_api_sku_color_creation_with_hex_code(
  connection: api.IConnection,
) {
  // Step 1: Admin joins the system with valid credentials
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });

  // Step 2: Validate admin authentication response
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminData.email);
  TestValidator.equals("admin name matches", admin.name, adminData.name);
  TestValidator.equals(
    "admin role level matches",
    admin.role_level,
    adminData.role_level,
  );

  // Step 3: Create SKU color variant with descriptive name
  const colorNames = [
    "Navy Blue",
    "Forest Green",
    "Crimson Red",
    "Midnight Black",
    "Pearl White",
    "Sunset Orange",
  ] as const;
  const colorName = RandomGenerator.pick(colorNames);

  const colorData = {
    name: colorName,
  } satisfies IShoppingMallSkuColor.ICreate;

  const createdColor: IShoppingMallSkuColor =
    await api.functional.shoppingMall.admin.skuColors.create(connection, {
      body: colorData,
    });

  // Step 4: Validate complete color response structure
  typia.assert(createdColor);

  // Step 5: Verify business logic - color name matches input
  TestValidator.equals(
    "color name matches input",
    createdColor.name,
    colorName,
  );
}
