import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test retrieving detailed SKU color variant information by unique identifier.
 *
 * This test validates the complete workflow of creating and retrieving a SKU
 * color variant, which is essential for the product variant selection system in
 * the e-commerce platform.
 *
 * Business Context: SKU color variants are fundamental to the product catalog
 * system, enabling sellers to define color options for their products.
 * Customers need accurate color information including visual swatches when
 * selecting product variants during shopping.
 *
 * Test Workflow:
 *
 * 1. Authenticate as admin to gain permissions for color variant creation
 * 2. Create a new SKU color variant with a random color name
 * 3. Retrieve the created color variant using its unique ID
 * 4. Validate that all response properties match the created data
 * 5. Confirm the response structure conforms to IShoppingMallSkuColor type
 */
export async function test_api_sku_color_retrieval_by_id(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a new SKU color variant
  const colorName = `${RandomGenerator.name()} ${RandomGenerator.pick(["Blue", "Red", "Green", "Yellow", "Purple", "Orange"] as const)}`;

  const createdColor = await api.functional.shoppingMall.admin.skuColors.create(
    connection,
    {
      body: {
        name: colorName,
      } satisfies IShoppingMallSkuColor.ICreate,
    },
  );
  typia.assert(createdColor);

  // Step 3: Retrieve the SKU color variant by ID
  const retrievedColor = await api.functional.shoppingMall.skuColors.at(
    connection,
    {
      colorId: createdColor.id,
    },
  );
  typia.assert(retrievedColor);

  // Step 4: Validate the retrieved color matches the created color
  TestValidator.equals("color ID matches", retrievedColor.id, createdColor.id);
  TestValidator.equals(
    "color name matches",
    retrievedColor.name,
    createdColor.name,
  );
  TestValidator.equals(
    "created_at timestamp matches",
    retrievedColor.created_at,
    createdColor.created_at,
  );

  // Validate hex_code property (may be undefined as it's optional)
  TestValidator.equals(
    "hex_code matches",
    retrievedColor.hex_code,
    createdColor.hex_code,
  );
}
