import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSpecification";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
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

export async function test_api_administrator_sale_specifications_search_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminJoinConnection, {
    body: {},
  });
  typia.assert(adminJoin);
  // 2. Administrator logs in
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_administrator_login(adminLoginConnection, {
    body: {},
  });
  typia.assert(adminLogin);
  // 3. Seller joins
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(sellerJoin);
  // 4. Seller logs in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {},
  });
  typia.assert(sellerLogin);
  // 5. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerLoginConnection,
    {
      body: {},
    },
  );
  typia.assert(sale);
  // 6. Administrator searches sale specifications with filters that yield no results
  const searchResult =
    await api.functional.shoppingMall.administrator.sale_specifications.index(
      adminLoginConnection,
      {
        body: {
          specificationKey: "non-existent-key",
          specificationValue: "non-existent-value",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchResult);
  // 7. Validate that data is empty and pagination metadata is correct
  TestValidator.equals("data length", searchResult.data.length, 0);
  TestValidator.equals(
    "pagination current",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResult.pagination.limit, 10);
  TestValidator.equals(
    "pagination records",
    searchResult.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages", searchResult.pagination.pages, 0);
}
