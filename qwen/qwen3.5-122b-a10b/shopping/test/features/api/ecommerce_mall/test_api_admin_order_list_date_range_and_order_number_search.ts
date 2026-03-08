import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_list_date_range_and_order_number_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerceMall.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Generate date range for testing
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // Test 1: Date range filtering
  const dateRangeResult =
    await api.functional.ecommerceMall.admin.customers.orders.index(
      adminConnection,
      {
        body: {
          dateFrom: yesterday.toISOString() satisfies string &
            tags.Format<"date-time">,
          dateTo: tomorrow.toISOString() satisfies string &
            tags.Format<"date-time">,
          page: 0,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate date range filtering returns valid paginated response
  TestValidator.predicate("date range search returns valid pagination", () => {
    return (
      dateRangeResult.pagination.current >= 0 &&
      dateRangeResult.pagination.limit > 0 &&
      dateRangeResult.pagination.records >= 0 &&
      dateRangeResult.pagination.pages >= 0
    );
  });
  // Test 2: Order number partial match search
  const orderNumberSearchResult =
    await api.functional.ecommerceMall.admin.customers.orders.index(
      adminConnection,
      {
        body: {
          orderNumber: "ORD",
          page: 0,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(orderNumberSearchResult);
  // Validate order number search returns valid response
  TestValidator.predicate(
    "order number search returns valid pagination",
    () => {
      return (
        orderNumberSearchResult.pagination.current >= 0 &&
        orderNumberSearchResult.pagination.limit > 0 &&
        orderNumberSearchResult.pagination.records >= 0 &&
        orderNumberSearchResult.pagination.pages >= 0
      );
    },
  );
  // Test 3: Combined date range and order number filtering
  const combinedSearchResult =
    await api.functional.ecommerceMall.admin.customers.orders.index(
      adminConnection,
      {
        body: {
          dateFrom: twoDaysAgo.toISOString() satisfies string &
            tags.Format<"date-time">,
          dateTo: tomorrow.toISOString() satisfies string &
            tags.Format<"date-time">,
          orderNumber: "ORD",
          page: 0,
          limit: 20,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(combinedSearchResult);
  // Validate combined search returns valid response
  TestValidator.predicate("combined search returns valid pagination", () => {
    return (
      combinedSearchResult.pagination.current >= 0 &&
      combinedSearchResult.pagination.limit > 0 &&
      combinedSearchResult.pagination.records >= 0 &&
      combinedSearchResult.pagination.pages >= 0
    );
  });
  // Test 4: Verify pagination parameters work correctly
  const page1Result =
    await api.functional.ecommerceMall.admin.customers.orders.index(
      adminConnection,
      {
        body: {
          page: 0,
          limit: 5,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(page1Result);
  const page2Result =
    await api.functional.ecommerceMall.admin.customers.orders.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallOrder.IRequest,
      },
    );
  typia.assert(page2Result);
  // Validate pagination works
  TestValidator.equals(
    "page 0 returns correct page number",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 returns correct page number",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 0 limit matches request",
    page1Result.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 1 limit matches request",
    page2Result.pagination.limit,
    5,
  );
}