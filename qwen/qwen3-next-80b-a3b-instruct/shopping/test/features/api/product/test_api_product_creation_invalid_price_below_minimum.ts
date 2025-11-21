import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_product_creation_invalid_price_below_minimum(
  connection: api.IConnection,
) {
  const sellerJSON = JSON.stringify({
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    business_name: RandomGenerator.name(),
    business_address: RandomGenerator.paragraph(),
    tax_id: typia.random<string>(),
  }) satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJSON });
  typia.assert(seller);

  const productJSON = JSON.stringify({
    title: RandomGenerator.name(),
    description: RandomGenerator.content(),
    price: 0.0,
    tax_category_id: typia.random<string & tags.Format<"uuid">>(),
  }) satisfies IShoppingMallProduct.ICreate;

  await TestValidator.error(
    "product creation with price below minimum should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.create(connection, {
        body: productJSON,
      });
    },
  );
}
