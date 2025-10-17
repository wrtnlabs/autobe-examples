import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test retrieving detailed size variant information by its unique identifier.
 *
 * This test validates the public SKU size retrieval endpoint that returns
 * complete size information including the size value and metadata. The test
 * verifies that size variants can be retrieved without authentication since
 * size information is public catalog data.
 *
 * Test Flow:
 *
 * 1. Create an admin account for authentication
 * 2. Admin creates a new size variant attribute
 * 3. Retrieve the created size variant by ID using public endpoint
 * 4. Validate response matches the created size data
 * 5. Verify all size properties are correctly returned
 */
export async function test_api_sku_size_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin creates a new size variant
  const sizeValue = RandomGenerator.pick([
    "Small",
    "Medium",
    "Large",
    "XL",
    "XXL",
  ] as const);

  const createdSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: {
        value: sizeValue,
      } satisfies IShoppingMallSkuSize.ICreate,
    });
  typia.assert(createdSize);

  // Step 3: Retrieve the size variant by ID (public endpoint, no auth required)
  const retrievedSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.skuSizes.at(connection, {
      sizeId: createdSize.id,
    });
  typia.assert(retrievedSize);

  // Step 4: Validate the retrieved size matches the created size
  TestValidator.equals(
    "retrieved size ID matches created size ID",
    retrievedSize.id,
    createdSize.id,
  );

  TestValidator.equals(
    "retrieved size value matches created size value",
    retrievedSize.value,
    createdSize.value,
  );

  TestValidator.equals(
    "retrieved size value matches original input",
    retrievedSize.value,
    sizeValue,
  );
}
