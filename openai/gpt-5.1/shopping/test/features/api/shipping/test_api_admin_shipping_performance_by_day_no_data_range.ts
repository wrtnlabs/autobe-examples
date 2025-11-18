import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingPerformanceByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingPerformanceByDay";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallShippingPerformanceByDay } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPerformanceByDay";

export async function test_api_admin_shipping_performance_by_day_no_data_range(
  connection: api.IConnection,
) {
  // 1. Arrange: register a new admin to obtain an authorized context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Act: call the shipping performance by day statistics endpoint.
  const page: IPageIShoppingMallShippingPerformanceByDay =
    await api.functional.shoppingMall.admin.statistics.shippingPerformanceByDay.index(
      connection,
    );
  typia.assert<IPageIShoppingMallShippingPerformanceByDay>(page);

  const pagination: IPage.IPagination = page.pagination;
  const data: IShoppingMallShippingPerformanceByDay[] = page.data;

  // 3. Basic pagination invariants: non-negative values.
  TestValidator.predicate(
    "pagination current non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );

  // 4. Branch on whether there are records.
  if (pagination.records === 0) {
    // No records should imply an empty data array.
    TestValidator.equals("zero records implies empty data", data.length, 0);

    // Platform convention: pages is 0 or 1 when no records.
    TestValidator.predicate(
      "zero records pages is 0 or 1",
      pagination.pages === 0 || pagination.pages === 1,
    );
  } else {
    // When there are records, we expect at least one page.
    TestValidator.predicate(
      "positive records implies non-empty pages",
      pagination.pages >= 1,
    );

    // Data length cannot exceed limit on the current page (unless limit is 0,
    // where we just accept whatever server returns but still ensure
    // non-negative length).
    if (pagination.limit > 0) {
      TestValidator.predicate(
        "current page data length not exceeding limit",
        data.length <= pagination.limit,
      );
    } else {
      TestValidator.predicate(
        "data length non-negative when limit is zero",
        data.length >= 0,
      );
    }

    // Validate each stats row structurally.
    for (const row of data) {
      typia.assert<IShoppingMallShippingPerformanceByDay>(row);
    }
  }
}
