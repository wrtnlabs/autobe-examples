import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_shopping_mall_product_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of product details by a seller
  // 1. Seller join (registration and authorization)
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  // Create a new connection with the seller's access token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorizedSeller.token.access}`,
  };
  // 2. Create a product using the authorized seller connection
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  const productWithId = product as unknown as { id: string & tags.Format<"uuid"> };
  // 3. Retrieve the product by productId
  const retrievedProduct = await api.functional.shoppingMall.seller.products.at(
    sellerConnection,
    { productId: productWithId.id },
  );
  typia.assert(retrievedProduct);
  const retrievedProductWithId = retrievedProduct as unknown as { id: string & tags.Format<"uuid"> };
  // Validate the retrieved product
  TestValidator.equals(
    "productId matches retrieved product",
    retrievedProductWithId.id,
    productWithId.id,
  );
  // Scenario 2: Retrieval attempt of non-existent or soft deleted product
  // 4. Attempt to retrieve a non-existent product
  await TestValidator.httpError(
    "retrieve non-existent product must fail with 404",
    404,
    async () => {
      const fakeProductId = typia.random<string & tags.Format<"uuid">>();
      await api.functional.shoppingMall.seller.products.at(sellerConnection, {
        productId: fakeProductId,
      });
    },
  );
}
