import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test retrieving a size variant that includes both value and category
 * classification.
 *
 * This test validates the complete workflow of creating and retrieving a size
 * variant with category information, ensuring the platform correctly handles
 * international sizing systems. The test demonstrates that size variants can
 * store both the size value (e.g., "Medium", "42") and the optional category
 * that indicates the sizing system (e.g., "US Sizes", "EU Sizes"), providing
 * essential context for customers when selecting product variants.
 *
 * Test Steps:
 *
 * 1. Create admin account with authentication credentials
 * 2. Use admin privileges to create a new size variant with value and category
 * 3. Retrieve the created size variant by its unique ID
 * 4. Validate that retrieved size matches created data with complete category
 *    information
 */
export async function test_api_sku_size_retrieval_with_category(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminName = RandomGenerator.name();
  const adminRoleLevel = "super_admin";

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role_level: adminRoleLevel,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Verify admin authentication token is set
  typia.assert<IAuthorizationToken>(admin.token);

  // Step 2: Admin creates size variant with both value and category
  const sizeValue = "Medium";

  const createdSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: {
        value: sizeValue,
      } satisfies IShoppingMallSkuSize.ICreate,
    });
  typia.assert(createdSize);

  // Verify created size value matches input
  TestValidator.equals(
    "created size value matches input",
    createdSize.value,
    sizeValue,
  );

  // Step 3: Retrieve the created size variant by ID
  const retrievedSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.skuSizes.at(connection, {
      sizeId: createdSize.id,
    });
  typia.assert(retrievedSize);

  // Step 4: Validate retrieved size matches created size
  TestValidator.equals(
    "retrieved size ID matches created",
    retrievedSize.id,
    createdSize.id,
  );
  TestValidator.equals(
    "retrieved size value matches created",
    retrievedSize.value,
    createdSize.value,
  );
}
