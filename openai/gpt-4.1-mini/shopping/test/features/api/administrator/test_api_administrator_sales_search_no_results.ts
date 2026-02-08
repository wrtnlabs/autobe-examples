import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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

export async function test_api_administrator_sales_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // Administrator user registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  const adminLoginAuthorized = await authorize_administrator_login(
    adminConnection,
    { body: {} },
  );
  typia.assert(adminLoginAuthorized);
  // Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  const sellerLoginAuthorized = await authorize_seller_login(sellerConnection, {
    body: {},
  });
  typia.assert(sellerLoginAuthorized);
  // Use seller authorized connection for creating one sale
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: sellerLoginAuthorized.token.access },
  };
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerAuthConnection,
    { body: {} },
  );
  typia.assert(sale);
  // Use admin authorized connection for searching sales with no matching criteria
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminLoginAuthorized.token.access },
  };
  const searchBody: IShoppingMallSale.IRequest = {
    name: "nonexistent-product-name-xyz-123",
    page: 1,
    limit: 10,
  };
  const searchResult =
    await api.functional.shoppingMall.administrator.sales.index(
      adminAuthConnection,
      { body: searchBody },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "sales search result data is empty",
    searchResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.equals(
    "pagination records count",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    searchResult.pagination.pages,
    0,
  );
}
