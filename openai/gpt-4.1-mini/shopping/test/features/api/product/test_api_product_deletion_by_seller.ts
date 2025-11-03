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

export async function test_api_product_deletion_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins the system
  const sellerCreateBody = {
    email: RandomGenerator.alphaNumeric(5) + "@example.com",
    password: "password123",
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(3),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Seller deletes the product by productCode
  await api.functional.shoppingMall.seller.products.erase(connection, {
    productCode: product.code,
  });

  // 4. Verify deletion by attempting to delete again and asserting that an error is thrown
  await TestValidator.error(
    "deleting already deleted product should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(connection, {
        productCode: product.code,
      });
    },
  );
}
