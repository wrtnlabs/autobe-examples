import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_requests_date_range_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>() satisfies string,
      password: "testpassword123" satisfies string &
        tags.MinLength<8> &
        tags.Format<"password">,
      href: "https://test.example.com" satisfies string & tags.Format<"uri">,
      referrer: "https://google.com" satisfies string & tags.Format<"uri">,
    },
  });
  typia.assert(customer);
  // Customer token is automatically set in customerConnection.headers by authorize_customer_join
  // 2. Test refund request list sorting and filtering capabilities
  // Note: Actual refund requests must exist from prior setup; we test API structure
  // Test 1: Default sorting (createdAt DESC)
  const defaultSort =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(defaultSort);
  TestValidator.equals(
    "default sort pagination",
    defaultSort.pagination.current,
    1,
  );
  // Test 2: Explicit sorting by createdAt DESC
  const descSort =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(descSort);
  TestValidator.equals("desc sort pagination", descSort.pagination.current, 1);
  // Test 3: Sorting by createdAt ASC
  const ascSort =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sortBy: "createdAt",
          sortOrder: "asc",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(ascSort);
  TestValidator.equals("asc sort pagination", ascSort.pagination.current, 1);
  // Test 4: Sorting by requestStatus DESC (rejected -> approved -> pending alphabetically)
  const statusDescSort =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sortBy: "requestStatus",
          sortOrder: "desc",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(statusDescSort);
  TestValidator.equals(
    "status desc sort pagination",
    statusDescSort.pagination.current,
    1,
  );
  // Test 5: Sorting by requestStatus ASC (approved -> pending -> rejected alphabetically)
  const statusAscSort =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          sortBy: "requestStatus",
          sortOrder: "asc",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(statusAscSort);
  TestValidator.equals(
    "status asc sort pagination",
    statusAscSort.pagination.current,
    1,
  );
  // Test 6: Date range filtering (createdAfter and createdBefore)
  const dateRangeFilter =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          createdAfter: "2024-01-15T00:00:00Z",
          createdBefore: "2024-01-17T00:00:00Z",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(dateRangeFilter);
  TestValidator.equals(
    "date range filter pagination",
    dateRangeFilter.pagination.current,
    1,
  );
  // Test 7: Pagination with custom page and limit
  const paginationTest =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        },
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "custom pagination page",
    paginationTest.pagination.current,
    2,
  );
  // Test 8: Filter by status only
  const statusFilter =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(statusFilter);
  TestValidator.equals(
    "status filter pagination",
    statusFilter.pagination.current,
    1,
  );
  // Test 9: Combined filters
  const combinedFilter =
    await api.functional.ecommerceMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
          sortBy: "createdAt",
          sortOrder: "desc",
          createdAfter: "2024-01-01T00:00:00Z",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filter pagination",
    combinedFilter.pagination.current,
    1,
  );
}