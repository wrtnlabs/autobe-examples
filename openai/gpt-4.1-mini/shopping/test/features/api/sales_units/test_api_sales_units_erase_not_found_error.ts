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

export async function test_api_sales_units_erase_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and receives authorization
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
      shopName: RandomGenerator.name(1),
    },
  });
  typia.assert(authorizedSeller);
  // Update sellerJoinConnection with auth token for authenticated calls
  sellerJoinConnection.headers = {
    Authorization: authorizedSeller.token.access,
  };
  // 2. Create a sale for the seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerJoinConnection,
    { body: undefined },
  );
  typia.assert(sale);
  // 3. Create a sale unit under the sale
  const unit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerJoinConnection,
      { params: { saleId: sale.id }, body: undefined },
    );
  typia.assert(unit);
  // 4. Attempt to erase a non-existent sale unit - generate random UUID not used
  const randomNonExistentUnitId = typia.random<string & tags.Format<"uuid">>();
  // 5. Call erase API and expect 404 Not Found error
  await TestValidator.httpError(
    "erase non-existent sale unit should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.units.erase(
        sellerJoinConnection,
        {
          saleId: sale.id,
          unitId: randomNonExistentUnitId,
        },
      );
    },
  );
}
