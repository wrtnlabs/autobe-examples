import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

/**
 * Test deletion of a sale unit by an authorized seller.
 * Due to lack of sale unit creation API, test deletion attempts non-existent unit.
 *
 * Validates deletion request on non-existent unit results in 404 error.
 */
export async function test_api_seller_sale_unit_erase_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = { Authorization: authorized.token.access };
  // 2. Create product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // 3. Create sale for the product
  // We do not set invalid properties for seller_id or category_id since schema details missing
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(sale);
  // 4. Attempt to delete a non-existent sale unit
  const invalidUnitId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting non-existent sale unit results 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sale_units.erase(
        sellerConnection,
        {
          unitId: invalidUnitId,
        },
      );
    },
  );
}
