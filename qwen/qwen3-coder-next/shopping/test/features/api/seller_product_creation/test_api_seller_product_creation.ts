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

export async function test_api_seller_product_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection for authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register seller account (joins as seller to get authentication token)
  const sellerAuth = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    },
  );
  typia.assert(sellerAuth);
  // Step 2: Create product using seller's authenticated connection
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: typia.random<IShoppingMallProduct.ICreate>(),
    },
  );
  typia.assert(product);
}
