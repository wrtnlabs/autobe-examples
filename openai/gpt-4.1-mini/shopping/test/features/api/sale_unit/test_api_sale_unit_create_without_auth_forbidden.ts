import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { generate_random_shopping_mall_seller_sales_units_create_unit } from "../../../generate/generate_random_shopping_mall_seller_sales_units_create_unit";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_unit } from "../../../prepare/prepare_random_shopping_mall_sale_unit";

/**
 * Test validation of authorization: attempt to create a sale unit without seller authentication. The operation should be forbidden. Successful creation requires prior seller join (auth) and sale creation. This test verifies that unauthorized requests are denied.
 */
export async function test_api_sale_unit_create_without_auth_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller join to prepare seller data
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  const seller: IShoppingMallSeller.IAuthorized = await authorize_seller_join(
    sellerAuthConnection,
    { body: { email: undefined, password: undefined, shopName: undefined } },
  );
  typia.assert(seller);
  // 2. Create a sale with authenticated seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: seller.token.access,
  };
  const sale: IShoppingMallSale =
    await generate_random_shopping_mall_seller_sales_create(sellerConnection, {
      body: {},
    });
  typia.assert(sale);
  // 3. Attempt to create a sale unit without authentication
  const noAuthConnection: api.IConnection = { host: connection.host };
  // Prepare sale unit creation payload
  const saleUnitBody: IShoppingMallSaleUnit.ICreate = {
    sku_code: `sku-${typia.random<string>().slice(0, 8)}`,
    option_values: JSON.stringify({ color: "red", size: "M" }),
    price_override: undefined,
  };
  // 4. Expect to fail with authorization error (HTTP 403 or 401) when creating sale unit without authentication
  await TestValidator.httpError(
    "create sale unit without auth should be forbidden",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.sales.units.createUnit(
        noAuthConnection,
        {
          saleId: sale.id,
          body: saleUnitBody,
        },
      );
    },
  );
}
