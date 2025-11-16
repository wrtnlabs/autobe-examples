import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_product_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins and authenticates
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPass123!",
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(sellerAuthorized);
  TestValidator.predicate(
    "seller authorized has jwt token",
    sellerAuthorized.token?.access.length > 0,
  );

  // 2. Seller creates a new shopping mall product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: null,
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: productCreateBody,
      },
    );
  typia.assert(product);

  // Validate product fields
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
    "product description is null",
    product.description,
    null,
  );
  TestValidator.equals("product is active", product.is_active, true);
}
