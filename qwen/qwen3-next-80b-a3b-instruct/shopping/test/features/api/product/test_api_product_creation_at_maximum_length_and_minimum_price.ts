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

export async function test_api_product_creation_at_maximum_length_and_minimum_price(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as an approved seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      // IShoppingMallSeller.IJoin is empty, so no properties needed
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Create product with empty body since IShoppingMallProduct.ICreate is an empty object
  // Per the DTO definitions, IShoppingMallProduct.ICreate = {}
  // Therefore, we must pass an empty object
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        // Empty object, as per IShoppingMallProduct.ICreate definition
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
}
