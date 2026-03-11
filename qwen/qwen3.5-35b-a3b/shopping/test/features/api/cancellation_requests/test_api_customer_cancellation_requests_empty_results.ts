import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

export async function test_api_customer_cancellation_requests_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a new customer account (no cancellation requests will be created)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: "1234",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create new connection with customer's token for authenticated API calls
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerAuth.token.access,
    },
  };
  // 2. Test: Call status endpoint without any filters
  const emptyResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.status.index(
      authenticatedCustomerConnection,
      {
        body: {},
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("data array is empty", emptyResult.data.length, 0);
  TestValidator.equals(
    "pagination records count is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count is 0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page is 1",
    emptyResult.pagination.current,
    1,
  );
  // 3. Test: Filter by status="pending" (should still be empty)
  const pendingFilterResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.status.index(
      authenticatedCustomerConnection,
      {
        body: { status: "pending" },
      },
    );
  typia.assert(pendingFilterResult);
  TestValidator.equals(
    "pending filter returns empty data",
    pendingFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "pending filter pagination records is 0",
    pendingFilterResult.pagination.records,
    0,
  );
  // 4. Test: Filter by status="approved" (should still be empty)
  const approvedFilterResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.status.index(
      authenticatedCustomerConnection,
      {
        body: { status: "approved" },
      },
    );
  typia.assert(approvedFilterResult);
  TestValidator.equals(
    "approved filter returns empty data",
    approvedFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "approved filter pagination records is 0",
    approvedFilterResult.pagination.records,
    0,
  );
  // 5. Test: Filter by status="rejected" (should still be empty)
  const rejectedFilterResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.status.index(
      authenticatedCustomerConnection,
      {
        body: { status: "rejected" },
      },
    );
  typia.assert(rejectedFilterResult);
  TestValidator.equals(
    "rejected filter returns empty data",
    rejectedFilterResult.data.length,
    0,
  );
  TestValidator.equals(
    "rejected filter pagination records is 0",
    rejectedFilterResult.pagination.records,
    0,
  );
  // 6. Test: Filter by date range (should still be empty)
  const dateRangeResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.status.index(
      authenticatedCustomerConnection,
      {
        body: {
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals(
    "date range filter returns empty data",
    dateRangeResult.data.length,
    0,
  );
  TestValidator.equals(
    "date range filter pagination records is 0",
    dateRangeResult.pagination.records,
    0,
  );
  // 7. Test: Filter by orderItemId (should still be empty)
  const orderItemIdResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.status.index(
      authenticatedCustomerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(orderItemIdResult);
  TestValidator.equals(
    "orderItemId filter returns empty data",
    orderItemIdResult.data.length,
    0,
  );
  TestValidator.equals(
    "orderItemId filter pagination records is 0",
    orderItemIdResult.pagination.records,
    0,
  );
}