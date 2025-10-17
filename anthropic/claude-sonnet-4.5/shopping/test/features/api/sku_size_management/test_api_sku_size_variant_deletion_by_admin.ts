import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test the complete workflow of permanently deleting a SKU size variant by an
 * administrator.
 *
 * This test validates that administrators can remove size definitions from the
 * platform's variant taxonomy system while enforcing referential integrity
 * constraints. The test creates an admin account, creates a size variant,
 * permanently deletes it, and verifies complete removal from the database.
 *
 * Workflow steps:
 *
 * 1. Create and authenticate admin account
 * 2. Create a new SKU size variant
 * 3. Perform hard delete operation on the size variant
 * 4. Verify deletion succeeds (returns void/204 No Content)
 * 5. Confirm the size is completely removed from the system
 *
 * Business validation:
 *
 * - Only authenticated admins can delete size variants
 * - Hard delete permanently removes records (not soft delete)
 * - Size records are completely removed from shopping_mall_sku_sizes table
 * - Deletion enforces referential integrity (would fail if SKUs reference this
 *   size)
 */
export async function test_api_sku_size_variant_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
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

  // Validate admin authentication response contains required fields
  TestValidator.equals("admin email matches", admin.email, adminData.email);
  TestValidator.equals("admin name matches", admin.name, adminData.name);
  TestValidator.equals(
    "admin role matches",
    admin.role_level,
    adminData.role_level,
  );

  // Step 2: Create a new SKU size variant
  const sizeData = {
    value: "XS",
  } satisfies IShoppingMallSkuSize.ICreate;

  const createdSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: sizeData,
    });
  typia.assert(createdSize);

  // Validate created size has proper structure and values
  TestValidator.equals("size value matches", createdSize.value, sizeData.value);

  // Step 3: Perform hard delete operation on the size variant
  await api.functional.shoppingMall.admin.skuSizes.erase(connection, {
    sizeId: createdSize.id,
  });

  // Step 4: Verify the size has been permanently deleted
  // Attempting to delete the same size again should result in an error
  // because the size no longer exists in the database
  await TestValidator.error(
    "deleting non-existent size should fail",
    async () => {
      await api.functional.shoppingMall.admin.skuSizes.erase(connection, {
        sizeId: createdSize.id,
      });
    },
  );
}
