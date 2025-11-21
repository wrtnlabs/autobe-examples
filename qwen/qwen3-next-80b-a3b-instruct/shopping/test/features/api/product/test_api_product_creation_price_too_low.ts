import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_creation_price_too_low(
  connection: api.IConnection,
) {
  // Step 1: Create a seller account - IShoppingMallSeller.ICreate is a string type
  const sellerEmail = typia.random<string & tags.Format<"email">>();

  // IShoppingMallSeller.ICreate is defined as string, so we construct a JSON string
  const sellerJson = JSON.stringify({
    email: sellerEmail,
    password: "SecurePassword123!",
    business_name: RandomGenerator.name(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  });

  // Call join endpoint with string payload
  const createdSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJson,
    });
  typia.assert(createdSeller);

  // Step 2: Attempt to create product with invalid price ($0.00)
  // IShoppingMallProduct.ICreate is defined as string, so we construct JSON string
  const productJson = JSON.stringify({
    title: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 2 }),
    price: 0.0, // This is the invalid value below minimum threshold
    tax_category_id: RandomGenerator.alphaNumeric(10),
  });

  // Use TestValidator.error to verify API rejects this request due to price validation
  await TestValidator.error(
    "product creation should fail when price is below minimum threshold ($0.01)",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productJson,
      });
    },
  );
}
