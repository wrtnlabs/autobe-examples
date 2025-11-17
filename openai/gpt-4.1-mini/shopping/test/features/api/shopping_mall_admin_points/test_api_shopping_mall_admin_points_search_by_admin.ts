import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPoints";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPoints";

export async function test_api_shopping_mall_admin_points_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin signs up and obtains authorization token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminStrongPassword123!",
        ip: null,
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Perform searches with different filtering options

  // Base parameters for pagination and sorting
  const baseRequest = {
    page: 1,
    limit: 10,
    sort_by: "balance" as const,
    sort_order: "desc" as const,
  } satisfies IShoppingMallPoints.IRequest;

  // 2a. Search without any filters
  const response1: IPageIShoppingMallPoints.ISummary =
    await api.functional.shoppingMall.admin.points.index(connection, {
      body: baseRequest,
    });
  typia.assert(response1);
  TestValidator.predicate(
    "response1 has pagination current",
    response1.pagination.current >= 0,
  );

  // 2b. Search with search_text filter
  const searchText = RandomGenerator.name(1);
  const requestWithSearchText = {
    ...baseRequest,
    search_text: searchText,
  } satisfies IShoppingMallPoints.IRequest;
  const response2: IPageIShoppingMallPoints.ISummary =
    await api.functional.shoppingMall.admin.points.index(connection, {
      body: requestWithSearchText,
    });
  typia.assert(response2);
  TestValidator.predicate(
    "response2 has pagination current",
    response2.pagination.current >= 0,
  );

  // 2c. Search with min_balance and max_balance filtering
  const minBalance = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const maxBalance = minBalance + 1000;
  const requestWithBalanceFilter = {
    ...baseRequest,
    min_balance: minBalance satisfies number as number,
    max_balance: maxBalance satisfies number as number,
  } satisfies IShoppingMallPoints.IRequest;
  const response3: IPageIShoppingMallPoints.ISummary =
    await api.functional.shoppingMall.admin.points.index(connection, {
      body: requestWithBalanceFilter,
    });
  typia.assert(response3);
  TestValidator.predicate(
    "response3 data all balances within range",
    response3.data.every(
      (item) => item.balance >= minBalance && item.balance <= maxBalance,
    ),
  );

  // 2d. Search with start_date and end_date filtering
  const now = new Date();
  const startDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const endDate = now.toISOString();
  const requestWithDateFilter = {
    ...baseRequest,
    start_date: startDate,
    end_date: endDate,
    sort_by: "created_at",
    sort_order: "asc",
  } satisfies IShoppingMallPoints.IRequest;
  const response4: IPageIShoppingMallPoints.ISummary =
    await api.functional.shoppingMall.admin.points.index(connection, {
      body: requestWithDateFilter,
    });
  typia.assert(response4);
  TestValidator.predicate(
    "response4 pagination current present",
    response4.pagination.current >= 0,
  );

  // 2e. Search with sorting by updated_at asc
  const requestWithSorting = {
    ...baseRequest,
    sort_by: "updated_at",
    sort_order: "asc",
  } satisfies IShoppingMallPoints.IRequest;
  const response5: IPageIShoppingMallPoints.ISummary =
    await api.functional.shoppingMall.admin.points.index(connection, {
      body: requestWithSorting,
    });
  typia.assert(response5);
  TestValidator.equals(
    "sort_order is asc, current page is 1",
    response5.pagination.current,
    1,
  );
}
