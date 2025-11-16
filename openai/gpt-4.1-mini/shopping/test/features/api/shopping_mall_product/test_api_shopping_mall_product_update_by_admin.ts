import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Test the update functionality of an existing shopping mall product by an
 * authenticated admin user.
 *
 * This test follows a sequence:
 *
 * 1. Register a new admin user to obtain authentication.
 * 2. Create a new shopping mall product with valid details.
 * 3. Update the created product's details including name, description (cleared),
 *    and active status.
 * 4. Validate that the product information has been correctly updated.
 */
export async function test_api_shopping_mall_product_update_by_admin(
  connection: api.IConnection,
) {
  // Register and authenticate as admin user
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "1234",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(createdAdmin);

  // Create a new product to update
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 5,
      wordMax: 10,
    }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(createdProduct);

  TestValidator.equals(
    "created and returned product code matches",
    createdProduct.code,
    productCreateBody.code,
  );

  // Prepare update data
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
    description: null, // explicitly clear the description
    is_active: false,
  } satisfies IShoppingMallProduct.IUpdate;

  // Update the created product
  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.shoppingMallProducts.update(
      connection,
      {
        productCode: createdProduct.code,
        body: updateBody,
      },
    );
  typia.assert(updatedProduct);

  // Validate updated product properties
  TestValidator.equals(
    "product code remains unchanged",
    updatedProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    updateBody.name,
  );
  TestValidator.equals(
    "product description removed (null)",
    updatedProduct.description,
    null,
  );
  TestValidator.equals(
    "product active status updated",
    updatedProduct.is_active,
    false,
  );
}
