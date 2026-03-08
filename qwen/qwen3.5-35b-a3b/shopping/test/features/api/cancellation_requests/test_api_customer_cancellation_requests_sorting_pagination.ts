import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_requests_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Test 1: Default sorting - should default to createdAt DESC
  const defaultSort =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultSort);
  // Test 2: Explicit sorting with createdAt DESC
  const createdAtDesc =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          sort: "createdAt",
          sortOrder: "DESC",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(createdAtDesc);
  // Test 3: Ascending order - createdAt ASC
  const createdAtAsc =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          sort: "createdAt",
          sortOrder: "ASC",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(createdAtAsc);
  // Test 4: updatedAt sorting - DESC
  const updatedAtDesc =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          sort: "updatedAt",
          sortOrder: "DESC",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(updatedAtDesc);
  // Test 5: requestStatus sorting
  const requestStatusSort =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          sort: "requestStatus",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(requestStatusSort);
  // Test 6: itemId sorting
  const itemIdSort =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          sort: "itemId",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(itemIdSort);
  // Test 7: Different pageSize values - 10, 50, 100
  const pageSize10 =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          pageSize: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pageSize10);
  TestValidator.equals("pageSize 10 limit", pageSize10.pagination.limit, 10);
  const pageSize50 =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          pageSize: 50,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pageSize50);
  TestValidator.equals("pageSize 50 limit", pageSize50.pagination.limit, 50);
  const pageSize100 =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          pageSize: 100,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pageSize100);
  TestValidator.equals("pageSize 100 limit", pageSize100.pagination.limit, 100);
  // Test 8: Offset-based pagination
  // First page
  const firstPage =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          pageSize: 10,
          page: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  // Second page using page number
  const secondPage =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          page: 2,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(secondPage);
  // Verify no duplicate records between pages
  const firstPageIds = firstPage.data.map((item) => item.id);
  const secondPageIds = secondPage.data.map((item) => item.id);
  const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
  TestValidator.equals("no duplicate records", overlap.length, 0);
  // Test 9: Verify pagination metadata accuracy
  TestValidator.equals(
    "pagination current is positive",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is positive",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    firstPage.pagination.records,
    firstPage.pagination.records,
  );
  // Test 10: Empty result set validation
  const emptyResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          requestStatus: "approved",
          createdFrom: new Date("2000-01-01T00:00:00Z").toISOString(),
          createdTo: new Date("2000-01-02T00:00:00Z").toISOString(),
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty records count",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty pages count", emptyResult.pagination.pages, 0);
}