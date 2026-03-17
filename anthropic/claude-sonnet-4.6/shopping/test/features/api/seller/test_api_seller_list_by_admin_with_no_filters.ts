import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_list_by_admin_with_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup: Register 3 seller accounts with distinct shop names
  const sellerInfos = [
    {
      shopName: "Alpha Shop",
      email: typia.random<string & tags.Format<"email">>(),
    },
    {
      shopName: "Beta Store",
      email: typia.random<string & tags.Format<"email">>(),
    },
    {
      shopName: "Gamma Market",
      email: typia.random<string & tags.Format<"email">>(),
    },
  ];
  const registeredSellers: IShoppingMallSeller.IAuthorized[] = [];
  for (const info of sellerInfos) {
    const sellerConn: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConn, {
      body: {
        shop_name: info.shopName,
        email: info.email,
      },
    });
    typia.assert(seller);
    registeredSellers.push(seller);
  }
  // 3. Primary Test: No filters
  const noFilterResult = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {} satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(noFilterResult);
  // Verify pagination fields
  TestValidator.equals(
    "pagination current page",
    noFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 3",
    noFilterResult.pagination.records >= 3,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    noFilterResult.pagination.pages >= 1,
  );
  // Verify all registered sellers appear in the result
  for (const registered of registeredSellers) {
    TestValidator.predicate(
      `registered seller ${registered.id} found in list`,
      noFilterResult.data.some((s) => s.id === registered.id),
    );
  }
  // 4. Pagination Test: page=1, limit=1
  const paginatedResult = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: { page: 1, limit: 1 } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals("paginated data length", paginatedResult.data.length, 1);
  TestValidator.equals("paginated limit", paginatedResult.pagination.limit, 1);
  TestValidator.predicate(
    "pagination pages >= 3",
    paginatedResult.pagination.pages >= 3,
  );
  // 5. Sorting Test: sortBy shopName asc
  const sortedResult = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        sortBy: "shopName",
        sortDirection: "asc",
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(sortedResult);
  // Verify ascending order by shopName
  const shopNames = sortedResult.data.map((s) => s.shopName);
  for (let i = 0; i < shopNames.length - 1; i++) {
    TestValidator.predicate(
      `shopName[${i}] <= shopName[${i + 1}]`,
      shopNames[i]!.localeCompare(shopNames[i + 1]!) <= 0,
    );
  }
}
