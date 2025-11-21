import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_creation_description_too_short(
  connection: api.IConnection,
) {
  const seller = await api.functional.auth.seller.join(connection, {
    body: typia.random<IShoppingMallSeller.ICreate>(),
  });
  typia.assert(seller);

  // Create a JSON object with minimum required properties
  const productData = {
    title: RandomGenerator.name(),
    description: "x".repeat(19), // Exactly 19 characters to trigger minimum length validation
    price: 29.99,
    tax_category_id: typia.random<string & tags.Format<"uuid">>(),
  };

  // Convert to JSON string since IShoppingMallProduct.ICreate is defined as string
  const productJsonString = JSON.stringify(productData);

  // Validate that the API rejects this request with 400 Bad Request
  await TestValidator.error(
    "product creation should fail with description less than 20 characters",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productJsonString satisfies IShoppingMallProduct.ICreate,
      });
    },
  );
}
