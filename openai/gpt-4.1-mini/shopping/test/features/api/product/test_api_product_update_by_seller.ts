import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test the product update functionality by a seller.
 *
 * This test covers the entire workflow for a seller to update product details.
 * It includes the following steps:
 *
 * 1. Seller account creation and authentication
 * 2. Product creation with initial properties
 * 3. Product update by modifying name, description, and brand
 * 4. Validation that update reflects correctly
 *
 * This verifies that sellers can modify their products securely and accurately
 * through the appropriate API endpoint.
 */
export async function test_api_product_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller account creation and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "securepassword123",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Create product with initial data
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
    }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Update product's name, description, and brand
  const productUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 4, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    brand: RandomGenerator.name(2),
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productCode: product.code,
      body: productUpdateBody,
    });
  typia.assert(updatedProduct);

  // 4. Validate that the updated product matches the update body
  TestValidator.equals(
    "product code remains unchanged",
    updatedProduct.code,
    product.code,
  );
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    productUpdateBody.name,
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    productUpdateBody.description,
  );
  TestValidator.equals(
    "product brand updated",
    updatedProduct.brand,
    productUpdateBody.brand,
  );
}
