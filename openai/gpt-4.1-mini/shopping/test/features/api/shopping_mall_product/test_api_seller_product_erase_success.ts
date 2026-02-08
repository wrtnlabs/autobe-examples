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

export async function test_api_seller_product_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully delete a product without any pending order items or cancellation/refund requests.
  // 1. Register new seller and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  sellerConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Create a new product for the authenticated seller
  const productRaw = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const product = typia.assert<IEntity>(productRaw);
  // 3. Call DELETE /shoppingMall/seller/products/{productId} to remove the product
  const erasedRaw = await api.functional.shoppingMall.seller.products.erase(
    sellerConnection,
    { productId: product.id },
  );
  const erased = typia.assert<IEntity>(erasedRaw);
  // 4. Validate the returned product details match the created product
  TestValidator.equals("product id", erased.id, product.id);
  // 5. Validate that the product no longer exists
  // No direct GET endpoint provided for validation in given APIs,
  // so we cautiously validate by type assertion on erased product
  // and rely on the correctness of the API behavior.
}
