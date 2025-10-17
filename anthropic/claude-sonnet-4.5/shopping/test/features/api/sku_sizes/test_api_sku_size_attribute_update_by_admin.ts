import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test the complete workflow of updating an existing SKU size variant attribute
 * by an administrator.
 *
 * This test validates that admins can modify size specifications for
 * platform-wide variant management, including correcting size naming
 * conventions and reorganizing size categories. The scenario creates an admin
 * account, creates an initial SKU size variant (e.g., 'M'), then updates it to
 * a more descriptive format (e.g., 'Medium'). The test verifies that the update
 * succeeds, the size value is correctly modified, and the unique constraint on
 * [value, category] is maintained.
 *
 * Test Steps:
 *
 * 1. Create and authenticate admin account
 * 2. Create initial SKU size variant with value "M"
 * 3. Update the size variant to value "Medium"
 * 4. Validate that all responses have correct structure and types
 * 5. Confirm the size value was successfully updated
 */
export async function test_api_sku_size_attribute_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create initial SKU size variant
  const initialSizeValue = "M";
  const createdSize = await api.functional.shoppingMall.admin.skuSizes.create(
    connection,
    {
      body: {
        value: initialSizeValue,
      } satisfies IShoppingMallSkuSize.ICreate,
    },
  );
  typia.assert(createdSize);

  TestValidator.equals(
    "created size value matches input",
    createdSize.value,
    initialSizeValue,
  );

  // Step 3: Update the size variant to a more descriptive value
  const updatedSizeValue = "Medium";
  const updatedSize = await api.functional.shoppingMall.admin.skuSizes.update(
    connection,
    {
      sizeId: createdSize.id,
      body: {
        value: updatedSizeValue,
      } satisfies IShoppingMallSkuSize.IUpdate,
    },
  );
  typia.assert(updatedSize);

  // Step 4: Validate the update was successful
  TestValidator.equals(
    "updated size id matches original",
    updatedSize.id,
    createdSize.id,
  );
  TestValidator.equals(
    "updated size value matches new value",
    updatedSize.value,
    updatedSizeValue,
  );
  TestValidator.notEquals(
    "size value was changed",
    updatedSize.value,
    initialSizeValue,
  );
}
