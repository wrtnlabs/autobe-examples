import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_product_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a new seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerData = JSON.stringify({
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(),
    business_address: RandomGenerator.paragraph(),
    tax_id: RandomGenerator.alphaNumeric(15),
  });
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 2: Verify seller authentication token was set in connection
  TestValidator.equals(
    "authentication token was set in connection",
    connection.headers?.Authorization,
    seller.token.access,
  );

  // Step 3: Create a new product listing with string body
  const productData = JSON.stringify({
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 8,
    }),
    price: typia.random<number & tags.Minimum<0.01> & tags.Maximum<5000>>(),
    tax_category: "standard",
  });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productData satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 4: Validate that response is a string (limited validation due to schema definition)
  TestValidator.predicate(
    "product response is a string",
    typeof product === "string",
  );
}
