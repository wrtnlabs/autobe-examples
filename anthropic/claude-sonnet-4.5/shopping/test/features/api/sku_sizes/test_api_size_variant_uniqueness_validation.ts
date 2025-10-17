import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test that validates the uniqueness constraint on size variant combinations.
 *
 * This test ensures that the system prevents duplicate size definitions that
 * could confuse sellers when creating product variants. The test verifies that
 * attempting to create a second size variant with the same value as an existing
 * one results in an appropriate error, maintaining data integrity in the size
 * variant catalog.
 *
 * Test Flow:
 *
 * 1. Create and authenticate an admin account
 * 2. Create the first size variant with a specific value
 * 3. Attempt to create a duplicate size variant with the same value
 * 4. Verify that the duplicate creation is rejected with an error
 */
export async function test_api_size_variant_uniqueness_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create the first size variant
  const sizeValues = [
    "Small",
    "Medium",
    "Large",
    "XL",
    "XXL",
    "42",
    "44",
    "46",
  ] as const;
  const sizeValue = RandomGenerator.pick(sizeValues);

  const firstSize: IShoppingMallSkuSize =
    await api.functional.shoppingMall.admin.skuSizes.create(connection, {
      body: {
        value: sizeValue,
      } satisfies IShoppingMallSkuSize.ICreate,
    });
  typia.assert(firstSize);

  // Validate the first size value matches input (business logic check)
  TestValidator.equals(
    "first size value matches input",
    firstSize.value,
    sizeValue,
  );

  // Step 3: Attempt to create duplicate size variant - should fail
  await TestValidator.error(
    "duplicate size variant creation should fail",
    async () => {
      await api.functional.shoppingMall.admin.skuSizes.create(connection, {
        body: {
          value: sizeValue,
        } satisfies IShoppingMallSkuSize.ICreate,
      });
    },
  );
}
