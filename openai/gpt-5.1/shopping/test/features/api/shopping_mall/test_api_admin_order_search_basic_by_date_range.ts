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

export async function test_api_admin_order_search_basic_by_date_range(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare 30-day date range and search request body
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const from = new Date(now.getTime() - thirtyDaysMs);
  const createdFrom = from.toISOString();
  const createdTo = now.toISOString();

  const searchBody = {
    created_from: createdFrom,
    created_to: createdTo,
    page: 1,
    limit: 20,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallOrderSearch.IRequest;

  // 3. Call the admin order search endpoint
  const page = await api.functional.shoppingMall.admin.search.orders.index(
    connection,
    { body: searchBody },
  );
  typia.assert<IPageIShoppingMallOrderSearch.ISummary>(page);

  // 4. Validate pagination metadata
  const pagination = page.pagination;
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );
  TestValidator.equals("pagination limit should be 20", pagination.limit, 20);

  // 5. Validate each returned order summary's created_at is within range
  for (const order of page.data) {
    // Type of each order is already guaranteed by typia.assert(page)
    const createdAtDate = new Date(order.created_at);
    const fromTime = from.getTime();
    const toTime = now.getTime();
    const createdTime = createdAtDate.getTime();

    TestValidator.predicate(
      "order.created_at should be within the requested created_at range",
      createdTime >= fromTime && createdTime <= toTime,
    );
  }

  // 6. Verify results are sorted by created_at descending
  if (page.data.length > 1) {
    for (let i = 1; i < page.data.length; ++i) {
      const prev = page.data[i - 1];
      const curr = page.data[i];
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(curr.created_at).getTime();

      TestValidator.predicate(
        "orders must be sorted by created_at descending",
        prevTime >= currTime,
      );
    }
  }
}
