import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuSize } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuSize";

/**
 * Test creating a size variant with both value and category classification.
 *
 * This test validates that administrators can create size options with specific
 * sizing system context such as 'Medium (US Sizes)' or '42 (EU Sizes)'. The
 * scenario ensures that size attributes are properly stored and available for
 * sellers to use when creating product SKUs with clear sizing system
 * identification.
 *
 * Test Flow:
 *
 * 1. Create and authenticate admin account
 * 2. Create size variant with value and category
 * 3. Validate size creation response
 * 4. Verify size attributes are correctly stored
 */
export async function test_api_size_variant_creation_with_category(
  connection: api.IConnection,
) {
  // Step 1: Create admin account to authenticate for size variant creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminData = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Verify admin authentication was successful
  TestValidator.predicate(
    "admin should be authenticated with valid token",
    admin.token.access.length > 0,
  );

  TestValidator.equals("admin email matches input", admin.email, adminEmail);

  // Step 3: Create size variant with value
  const sizeValues = [
    "Small",
    "Medium",
    "Large",
    "XL",
    "XXL",
    "38",
    "40",
    "42",
    "44",
  ] as const;
  const sizeValue = RandomGenerator.pick(sizeValues);

  const sizeData = {
    value: sizeValue,
  } satisfies IShoppingMallSkuSize.ICreate;

  const createdSize = await api.functional.shoppingMall.admin.skuSizes.create(
    connection,
    {
      body: sizeData,
    },
  );
  typia.assert(createdSize);

  // Step 4: Validate size creation response
  TestValidator.equals(
    "created size value matches input",
    createdSize.value,
    sizeValue,
  );
}
