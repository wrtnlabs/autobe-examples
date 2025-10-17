import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test that size variant information can be retrieved without authentication.
 *
 * This test validates the business requirement that size information is
 * non-sensitive product catalog data available to all users including
 * unauthenticated visitors.
 *
 * Test workflow:
 *
 * 1. Create admin account to have authorization for creating size variants
 * 2. Admin creates a new size variant for testing public access
 * 3. Create unauthenticated connection to simulate guest visitor
 * 4. Attempt to retrieve the size variant without authentication credentials
 * 5. Verify that the request succeeds and returns complete size information
 * 6. Validate that returned data matches the created size variant
 */
export async function test_api_sku_size_public_access(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin creates a size variant
  const sizeValue = RandomGenerator.pick([
    "Small",
    "Medium",
    "Large",
    "XL",
    "38",
    "40",
    "42",
  ] as const);
  const createdSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: {
        value: sizeValue,
      } satisfies IShoppingMallSkuSize.ICreate,
    });
  typia.assert(createdSize);

  // Step 3: Create unauthenticated connection
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // Step 4: Retrieve size variant without authentication
  const retrievedSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.skuSizes.at(unauthConnection, {
      sizeId: createdSize.id,
    });
  typia.assert(retrievedSize);

  // Step 5 & 6: Verify the retrieved data matches created size variant
  TestValidator.equals(
    "retrieved size ID matches created size",
    retrievedSize.id,
    createdSize.id,
  );
  TestValidator.equals(
    "retrieved size value matches created size",
    retrievedSize.value,
    createdSize.value,
  );
}
