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

export async function test_api_product_detail_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller signs up
  const sellerCreateBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "SecureP@ssw0rd",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(createdProduct);

  TestValidator.equals(
    "Created product code matches input",
    createdProduct.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "Created product name matches input",
    createdProduct.name,
    productCreateBody.name,
  );

  // 3. Seller retrieves product detail by productCode
  const retrievedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.at(connection, {
      productCode: createdProduct.code,
    });
  typia.assert(retrievedProduct);

  TestValidator.equals(
    "Retrieved product ID matches created product ID",
    retrievedProduct.id,
    createdProduct.id,
  );
  TestValidator.equals(
    "Retrieved product code matches created product code",
    retrievedProduct.code,
    createdProduct.code,
  );
  TestValidator.equals(
    "Retrieved product name matches created product name",
    retrievedProduct.name,
    createdProduct.name,
  );
  TestValidator.equals(
    "Retrieved product description matches created product description",
    retrievedProduct.description ?? "",
    productCreateBody.description ?? "",
  );
  TestValidator.equals(
    "Retrieved product brand matches created product brand",
    retrievedProduct.brand ?? "",
    productCreateBody.brand ?? "",
  );
}
