import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
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

export async function test_api_administrator_sales_view_stats_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Creating new connections for different actors
  const adminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // 1. Administrator join and login
  const administrator = await authorize_administrator_join(adminConnection, { body: {} });
  typia.assert(administrator);
  // 2. Seller join and login
  const seller = await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(seller);
  // 3. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {},
  );
  typia.assert(sale);
  // 4. Administrator retrieves view statistics for the created sale
  const saleViewStats =
    await api.functional.shoppingMall.administrator.sales.view_stats.at(
      adminConnection,
      { saleId: sale.id },
    );
  typia.assert(saleViewStats);
  // 5. Validate presence of all expected fields
  TestValidator.predicate(
    "field viewCount is present and non-negative",
    saleViewStats.viewCount >= 0,
  );
  TestValidator.predicate(
    "field uniqueViewCount is present and non-negative",
    saleViewStats.uniqueViewCount >= 0,
  );
  TestValidator.predicate(
    "field firstViewedAt is a valid ISO date",
    typeof saleViewStats.firstViewedAt === "string" &&
      !Number.isNaN(Date.parse(saleViewStats.firstViewedAt)),
  );
  TestValidator.predicate(
    "field lastViewedAt is a valid ISO date",
    typeof saleViewStats.lastViewedAt === "string" &&
      !Number.isNaN(Date.parse(saleViewStats.lastViewedAt)),
  );
  TestValidator.predicate(
    "field createdAt is a valid ISO date",
    typeof saleViewStats.createdAt === "string" &&
      !Number.isNaN(Date.parse(saleViewStats.createdAt)),
  );
  TestValidator.predicate(
    "field updatedAt is a valid ISO date",
    typeof saleViewStats.updatedAt === "string" &&
      !Number.isNaN(Date.parse(saleViewStats.updatedAt)),
  );
  // deletedAt can be null or a valid ISO date
  TestValidator.predicate(
    "field deletedAt is null or a valid ISO date",
    saleViewStats.deletedAt === null ||
      (typeof saleViewStats.deletedAt === "string" &&
        !Number.isNaN(Date.parse(saleViewStats.deletedAt))),
  );
  // 6. Unauthorized access test
  // Attempt to get view stats without admin authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access returns 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sales.view_stats.at(
        unauthorizedConnection,
        { saleId: sale.id },
      );
    },
  );
  // 7. Request for non-existent saleId returns 404
  const nonExistentSaleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent saleId returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sales.view_stats.at(
        adminConnection,
        { saleId: nonExistentSaleId },
      );
    },
  );
}
