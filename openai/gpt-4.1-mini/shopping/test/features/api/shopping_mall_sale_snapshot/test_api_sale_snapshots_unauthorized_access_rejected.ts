import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
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
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_sale_snapshots_unauthorized_access_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Description: Test unauthorized access is rejected when non-administrator users attempt to fetch sale snapshots. Ensures sale snapshot data is not disclosed and correct error is thrown.
  // 1. Setup administrator actor
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    { body: {} },
  );
  typia.assert(adminAuthorized);
  // 2. Setup seller actor who will create the sale
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(sellerAuthorized);
  // 3. Setup another seller actor who will attempt unauthorized access
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSellerAuthorized = await authorize_seller_join(
    otherSellerConnection,
    { body: {} },
  );
  typia.assert(otherSellerAuthorized);
  // 4. Seller creates a sale record
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 5. Attempt unauthorized access: other seller tries to fetch sale snapshots
  await TestValidator.error("unauthorized seller access rejected", async () => {
    await api.functional.shoppingMall.administrator.sales.snapshots.index(
      otherSellerConnection,
      {
        saleId: sale.id,
        body: {}, // empty filter
      },
    );
  });
  // 6. Attempt unauthorized access: normal connection without login tries to fetch sale snapshots
  await TestValidator.error("unauthenticated access rejected", async () => {
    await api.functional.shoppingMall.administrator.sales.snapshots.index(
      connection,
      {
        saleId: sale.id,
        body: {},
      },
    );
  });
}
