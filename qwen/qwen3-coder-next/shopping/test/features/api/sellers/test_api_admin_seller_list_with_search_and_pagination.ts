import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

export async function test_api_admin_seller_list_with_search_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "admin@test.com",
    password: "1234",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // Test 1: Search with 'tech' - should find Tech Store
  const searchResult =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          search: "tech",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.predicate("found at least one seller with 'tech' in name", () =>
    searchResult.data.some((seller) =>
      seller.shop_name.toLowerCase().includes("tech"),
    ),
  );
  // Test 2: Pagination with limit parameter
  const paginatedResult =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    1,
  );
  TestValidator.predicate(
    "pagination info exists",
    () =>
      paginatedResult.pagination.pages >= 1 &&
      paginatedResult.pagination.records >= 1,
  );
  // Test 3: Default sorting (created_at:desc - newest first)
  const sortedResult =
    await api.functional.shoppingMall.admin.admin.sellers.index(
      adminConnection,
      {
        body: {
          sort: "created_at:desc",
          limit: 10,
        } satisfies IShoppingMallSeller.IRequest,
      },
    );
  typia.assert(sortedResult);
  if (sortedResult.data.length >= 2) {
    const firstSellerCreatedAt = new Date(
      sortedResult.data[0].created_at,
    ).getTime();
    const secondSellerCreatedAt = new Date(
      sortedResult.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "newest sellers first",
      () => firstSellerCreatedAt >= secondSellerCreatedAt,
    );
  }
}
