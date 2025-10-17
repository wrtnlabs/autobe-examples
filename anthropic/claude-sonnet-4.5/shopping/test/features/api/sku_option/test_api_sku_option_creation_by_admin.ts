import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuOption";

/**
 * Test admin creation of custom SKU options for platform-wide variant
 * management.
 *
 * This test validates that administrators can successfully create custom SKU
 * options that establish standardized variant taxonomies across the
 * marketplace. The test covers admin authentication and the creation of
 * option_name/option_value combinations that become available for all sellers
 * to reference when configuring product variants.
 *
 * Test workflow:
 *
 * 1. Create and authenticate an admin account
 * 2. Admin creates a custom SKU option with option_name and option_value
 * 3. Validate the created option has proper structure and unique ID
 * 4. Verify the option data matches the input specifications
 */
export async function test_api_sku_option_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin joins and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Validate admin authentication response
  TestValidator.predicate(
    "admin should have valid ID",
    admin.id !== null && admin.id !== undefined,
  );
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin name matches", admin.name, adminName);
  TestValidator.equals("admin role matches", admin.role_level, "super_admin");
  TestValidator.predicate(
    "admin token should exist",
    admin.token !== null && admin.token !== undefined,
  );

  // Step 2: Admin creates a custom SKU option
  const optionName = RandomGenerator.name(2); // e.g., "Storage Capacity"
  const optionValue = RandomGenerator.name(1); // e.g., "128GB"

  const skuOption: IShoppingMallSkuOption =
    await api.functional.shoppingMall.admin.skuOptions.create(connection, {
      body: {
        option_name: optionName,
        option_value: optionValue,
      } satisfies IShoppingMallSkuOption.ICreate,
    });
  typia.assert(skuOption);

  // Step 3: Validate the created SKU option
  TestValidator.predicate(
    "SKU option should have valid UUID",
    skuOption.id !== null && skuOption.id !== undefined,
  );
  TestValidator.equals(
    "option_name matches input",
    skuOption.option_name,
    optionName,
  );
  TestValidator.equals(
    "option_value matches input",
    skuOption.option_value,
    optionValue,
  );
}
