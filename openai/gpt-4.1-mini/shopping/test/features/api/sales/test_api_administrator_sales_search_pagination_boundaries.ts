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

export async function test_api_administrator_sales_search_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminJoin.token.access}`,
  };
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminLogin.token.access}`,
  };
  // 2. Seller join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerJoin.token.access}`,
  };
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerLogin.token.access}`,
  };
  // 3. Seller creates a sale
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(sale);
  // 4. Administrator performs sales search with page=1, limit=5
  const firstPageResult =
    await api.functional.shoppingMall.administrator.sales.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } as any,
      },
    );
  typia.assert(firstPageResult);
  TestValidator.predicate(
    "pagination current page >= 1",
    firstPageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    firstPageResult.pagination.limit >= 0,
  );
  // 5. Search with page number beyond total pages
  const beyondPage = firstPageResult.pagination.pages + 1;
  const beyondPageResult =
    await api.functional.shoppingMall.administrator.sales.index(
      adminConnection,
      {
        body: {
          page: beyondPage,
          limit: 5,
        } as any,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.predicate(
    "beyond page current <= total pages",
    beyondPageResult.pagination.current <= beyondPageResult.pagination.pages,
  );
  // 6. Search with very high limit
  const veryHighLimit = 1000;
  const highLimitResult =
    await api.functional.shoppingMall.administrator.sales.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: veryHighLimit,
        } as any,
      },
    );
  typia.assert(highLimitResult);
  TestValidator.predicate(
    "limit respects requested limit",
    highLimitResult.pagination.limit <= veryHighLimit,
  );
  // 7. Search with limit zero
  const zeroLimitResult =
    await api.functional.shoppingMall.administrator.sales.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 0,
        } as any,
      },
    );
  typia.assert(zeroLimitResult);
  TestValidator.predicate(
    "pagination limit is zero or greater",
    zeroLimitResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "data length <= limit",
    zeroLimitResult.data.length <= zeroLimitResult.pagination.limit,
  );
}
