import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test creating a basic size variant attribute without category specification.
 *
 * This test validates that administrators can create size options for product
 * variants by providing only a size value. The test follows a complete
 * workflow:
 *
 * 1. Create and authenticate an admin account
 * 2. Create a size variant with just a value (e.g., "Medium", "42")
 * 3. Verify the size is created with proper UUID, value, and structure
 *
 * Size variants enable sellers to differentiate products by size dimensions.
 * This test ensures the basic size creation works without requiring category
 * classification.
 */
export async function test_api_size_variant_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();
  const adminRole = "super_admin";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role_level: adminRole,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Verify admin account creation
  TestValidator.equals("admin email matches", admin.email, adminEmail);
  TestValidator.equals("admin name matches", admin.name, adminName);
  TestValidator.equals("admin role matches", admin.role_level, adminRole);

  // Step 2: Create size variant with only value (no category)
  const sizeValues = [
    "Small",
    "Medium",
    "Large",
    "XL",
    "42",
    "44",
    "10.5",
  ] as const;
  const selectedSizeValue = RandomGenerator.pick(sizeValues);

  const createdSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: {
        value: selectedSizeValue,
      } satisfies IShoppingMallSkuSize.ICreate,
    });
  typia.assert(createdSize);

  // Step 3: Verify size variant creation
  TestValidator.equals(
    "size value matches input",
    createdSize.value,
    selectedSizeValue,
  );
}
