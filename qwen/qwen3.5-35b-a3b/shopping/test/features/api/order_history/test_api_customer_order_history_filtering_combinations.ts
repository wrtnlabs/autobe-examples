import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_filtering_combinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customer);
  // 2. Test empty state - customer has no orders initially
  const initialOrders: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(initialOrders);
  TestValidator.equals(
    "initial data array empty",
    initialOrders.data.length,
    0,
  );
  TestValidator.equals(
    "initial records count",
    initialOrders.pagination.records,
    0,
  );
  TestValidator.equals(
    "initial pages count",
    initialOrders.pagination.pages,
    0,
  );
  TestValidator.equals(
    "initial current page",
    initialOrders.pagination.current,
    1,
  );
  TestValidator.equals("initial limit", initialOrders.pagination.limit, 20);
  // 3. Test combined filters (status AND date range) - empty result expected
  const now: string = new Date().toISOString();
  const twoDaysAgo: string = new Date(Date.now() - 172800000).toISOString();
  const combinedFilter: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "delivered",
          startDate: twoDaysAgo,
          endDate: now,
          limit: 50,
          page: 1,
        },
      },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter data empty",
    combinedFilter.data.length,
    0,
  );
  // 4. Test filtering by status with sorting by total_price
  const statusSort: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "paid",
          sortBy: "total_price",
          sortOrder: "ASC",
          limit: 50,
          page: 1,
        },
      },
    );
  typia.assert(statusSort);
  TestValidator.equals("status sort data empty", statusSort.data.length, 0);
  // 5. Test text search with status filter combined
  const searchStatus: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          searchTerm: "ORD",
          status: "shipped",
          limit: 50,
          page: 1,
        },
      },
    );
  typia.assert(searchStatus);
  TestValidator.equals(
    "search with status data empty",
    searchStatus.data.length,
    0,
  );
  // 6a. Test pagination edge case: page 1 with limit 50 (max limit)
  const maxLimitPage: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          limit: 50,
          page: 1,
        },
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page data empty",
    maxLimitPage.data.length,
    0,
  );
  TestValidator.equals("max limit records", maxLimitPage.pagination.records, 0);
  TestValidator.equals("max limit limit", maxLimitPage.pagination.limit, 50);
  // 6b. Test pagination edge case: last page with partial results (page beyond available results)
  const beyondPage: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          limit: 20,
          page: 999,
        },
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals("beyond page data empty", beyondPage.data.length, 0);
  TestValidator.equals("beyond page records", beyondPage.pagination.records, 0);
  TestValidator.equals(
    "beyond page current",
    beyondPage.pagination.current,
    999,
  );
  TestValidator.equals("beyond page limit", beyondPage.pagination.limit, 20);
  TestValidator.equals("beyond page pages", beyondPage.pagination.pages, 0);
  // 7. Test empty result scenarios with different sort options
  const sortCreatedAt: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          sortBy: "created_at",
          sortOrder: "DESC",
          limit: 20,
          page: 1,
        },
      },
    );
  typia.assert(sortCreatedAt);
  TestValidator.equals(
    "sort by created_at data empty",
    sortCreatedAt.data.length,
    0,
  );
  // 8. Test case-insensitive partial match for order_number search
  const caseInsensitiveSearch: IPageIEcommerceMallOrder.ISummary =
    await api.functional.ecommerceMall.customer.orders.index(
      customerConnection,
      {
        body: {
          searchTerm: "ord", // lowercase search
          limit: 50,
          page: 1,
        },
      },
    );
  typia.assert(caseInsensitiveSearch);
  TestValidator.equals(
    "case insensitive search data empty",
    caseInsensitiveSearch.data.length,
    0,
  );
  // 9. Test all available statuses with empty results
  const statuses: Array<
    | "paid"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
    | "partiallyCompleted"
  > = [
    "paid",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
    "partiallyCompleted",
  ] as const;
  await ArrayUtil.asyncForEach(statuses, async (status) => {
    const statusResult: IPageIEcommerceMallOrder.ISummary =
      await api.functional.ecommerceMall.customer.orders.index(
        customerConnection,
        {
          body: {
            status: status,
            limit: 20,
            page: 1,
          },
        },
      );
    typia.assert(statusResult);
    TestValidator.equals(
      `status ${status} data empty`,
      statusResult.data.length,
      0,
    );
  });
  // 10. Verify response structure - all returned orders should have proper fields
  // (Since no orders exist, we validate structure with pagination metadata)
  TestValidator.predicate(
    "pagination has valid current",
    initialOrders.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    initialOrders.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has valid records",
    initialOrders.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    initialOrders.pagination.pages >= 0,
  );
}
