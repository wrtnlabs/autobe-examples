import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSearch";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallOrderSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSearch";

export async function test_api_admin_order_search_invalid_pagination_rejected(
  connection: api.IConnection,
) {
  // 1. Register an admin so that subsequent calls are authenticated
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a base search body with no filters; pagination will be tweaked
  const baseSearchBody = {
    // no filters, only pagination fields will be set per case
  } satisfies IShoppingMallOrderSearch.IRequest;

  // 3. Call search with invalid page (0) and valid limit, expect error
  await TestValidator.error("order search rejects page = 0", async () => {
    await api.functional.shoppingMall.admin.search.orders.index(connection, {
      body: {
        ...baseSearchBody,
        page: 0,
        limit: 10,
      } satisfies IShoppingMallOrderSearch.IRequest,
    });
  });

  // 4. Call search with invalid limit (0) and valid page, expect error
  await TestValidator.error("order search rejects limit = 0", async () => {
    await api.functional.shoppingMall.admin.search.orders.index(connection, {
      body: {
        ...baseSearchBody,
        page: 1,
        limit: 0,
      } satisfies IShoppingMallOrderSearch.IRequest,
    });
  });

  // 5. Call search with a valid pagination combination to prove success
  const validPageResult: IPageIShoppingMallOrderSearch.ISummary =
    await api.functional.shoppingMall.admin.search.orders.index(connection, {
      body: {
        ...baseSearchBody,
        page: 1,
        limit: 5,
      } satisfies IShoppingMallOrderSearch.IRequest,
    });
  typia.assert(validPageResult);

  // 6. Basic sanity checks on the pagination metadata
  const pagination = validPageResult.pagination;
  typia.assert<IPage.IPagination>(pagination);

  TestValidator.predicate(
    "valid pagination current page should be 1",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "valid pagination limit should be positive",
    pagination.limit > 0,
  );
}
