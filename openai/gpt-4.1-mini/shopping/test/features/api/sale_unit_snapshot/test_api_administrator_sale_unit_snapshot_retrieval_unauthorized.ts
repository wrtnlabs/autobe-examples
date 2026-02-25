import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import type { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { generate_random_shopping_mall_seller_sales_units_create_unit } from "../../../generate/generate_random_shopping_mall_seller_sales_units_create_unit";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";
import { prepare_random_shopping_mall_sale_unit } from "../../../prepare/prepare_random_shopping_mall_sale_unit";

export async function test_api_administrator_sale_unit_snapshot_retrieval_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerpassword",
      shopName: "Seller Shop",
    },
  });
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "A product for testing snapshot unauthorized",
        base_price: 100,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(sale);
  // 3. Seller creates a sale unit under the sale
  const saleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {
          sku_code: "SKU-UNIT-1",
          option_values: JSON.stringify({ color: "red", size: "M" }),
          price_override: null,
        },
      },
    );
  typia.assert(saleUnit);
  // 4. Attempt to retrieve snapshot by seller, expect 403 Forbidden
  // Since snapshotId must exist, generate a random uuid which would NOT exist,
  // we focus on unauthorized rather than not found error
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized access to sale unit snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.administrator.sales.units.snapshots.at(
        sellerConnection,
        {
          saleId: sale.id,
          unitId: saleUnit.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
