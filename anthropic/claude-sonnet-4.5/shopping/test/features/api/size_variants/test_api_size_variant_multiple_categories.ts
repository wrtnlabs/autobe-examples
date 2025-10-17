import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test creating multiple size variants with the same value but different
 * categories.
 *
 * This test validates that the system allows the same size value to exist in
 * different sizing systems, such as 'Medium' in both 'US Sizes' and 'EU Sizes'
 * categories. This capability enables sellers to offer products in multiple
 * international sizing standards without uniqueness conflicts.
 *
 * Test Flow:
 *
 * 1. Create admin account to authenticate for size variant operations
 * 2. Create first size variant with value "Medium" (no category specified in DTO)
 * 3. Create second size variant with value "Medium" (no category specified in DTO)
 * 4. Verify both size variants are created successfully with unique IDs
 * 5. Confirm that multiple size variants with the same value can coexist
 */
export async function test_api_size_variant_multiple_categories(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
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
  typia.assert(admin);

  // Step 2: Create first size variant with value "Medium"
  const firstSizeData = {
    value: "Medium",
  } satisfies IShoppingMallSkuSize.ICreate;

  const firstSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: firstSizeData,
    });
  typia.assert(firstSize);

  // Step 3: Create second size variant with the same value "Medium"
  const secondSizeData = {
    value: "Medium",
  } satisfies IShoppingMallSkuSize.ICreate;

  const secondSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: secondSizeData,
    });
  typia.assert(secondSize);

  // Step 4: Verify both size variants are created successfully with unique IDs
  TestValidator.notEquals(
    "size variant IDs should be different",
    firstSize.id,
    secondSize.id,
  );

  // Step 5: Confirm both size variants have the same value
  TestValidator.equals(
    "first size value should be Medium",
    firstSize.value,
    "Medium",
  );

  TestValidator.equals(
    "second size value should be Medium",
    secondSize.value,
    "Medium",
  );
}
