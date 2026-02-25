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

export async function test_api_administrator_sale_unit_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Test successful retrieval of a sale unit snapshot by an authorized administrator.
  // This includes creating a new sale by a seller, adding a sale unit, and then retrieving
  // the immutable snapshot by snapshotId. Validate the response contains snapshot details such as
  // SKU code, option values, price override, stock quantity, and is_active status.
  // 1. Administrator join and automatically authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinOutput = await authorize_administrator_join(adminConnection, {
    body: { password: "12345678" },
  });
  typia.assert(adminJoinOutput);
  // adminConnection.headers is updated inside authorize function
  // 2. Seller join and automatically authorized
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinOutput = await authorize_seller_join(sellerConnection, {
    body: { password: "12345678" },
  });
  typia.assert(sellerJoinOutput);
  // sellerConnection.headers is updated inside authorize function
  // 3. Create a sale as seller
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(sale);
  // 4. Add a sale unit under the sale
  const saleUnit =
    await generate_random_shopping_mall_seller_sales_units_create_unit(
      sellerConnection,
      {
        params: { saleId: sale.id },
        body: {},
      },
    );
  typia.assert(saleUnit);
  // 5. Use saleUnit.id as snapshotId (approximation due to missing snapshot creation API)
  const snapshotId = saleUnit.id;
  // 6. Retrieve immutable sale unit snapshot as administrator
  const snapshot =
    await api.functional.shoppingMall.administrator.sales.units.snapshots.at(
      adminConnection,
      {
        saleId: sale.id,
        unitId: saleUnit.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot attributes
  TestValidator.equals("sku_code match", snapshot.skuCode, saleUnit.skuCode);
  TestValidator.equals(
    "option_values match",
    snapshot.optionValues,
    saleUnit.optionValues,
  );
  TestValidator.equals(
    "price_override match",
    snapshot.priceOverride ?? null,
    saleUnit.priceOverride ?? null,
  );
  TestValidator.predicate("stock quantity valid", snapshot.stockQuantity >= 0);
  TestValidator.predicate(
    "is_active boolean",
    typeof snapshot.isActive === "boolean",
  );
}
