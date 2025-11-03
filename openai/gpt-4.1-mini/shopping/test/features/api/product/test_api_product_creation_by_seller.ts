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

export async function test_api_product_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registers an account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "ComplexPass123!";
  const sellerCreateBody = {
    email: sellerEmail,
    password: sellerPassword,
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 2. Create a new product as authenticated seller
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 6, wordMax: 12 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Validate returned product properties match input and business rules
  TestValidator.predicate(
    "product ID exists",
    typeof product.id === "string" && product.id.length > 0,
  );
  TestValidator.equals(
    "product code matches",
    product.code,
    productCreateBody.code,
  );
  TestValidator.equals(
    "product name matches",
    product.name,
    productCreateBody.name,
  );
  TestValidator.equals(
    "product description matches",
    product.description,
    productCreateBody.description,
  );
  TestValidator.equals(
    "product brand matches",
    product.brand,
    productCreateBody.brand,
  );
  TestValidator.predicate(
    "product created_at is ISO string",
    typeof product.created_at === "string" && product.created_at.length > 0,
  );
  TestValidator.predicate(
    "product updated_at is ISO string",
    typeof product.updated_at === "string" && product.updated_at.length > 0,
  );
  TestValidator.equals(
    "product deleted_at is null or undefined",
    product.deleted_at ?? null,
    null,
  );
}
