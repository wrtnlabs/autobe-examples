import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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

export async function test_api_cancellation_request_pagination_with_date_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Test pagination - fetch first page with limit=10
  const firstPage =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata structure
  TestValidator.equals("page 1 current", firstPage.pagination.current, 1);
  TestValidator.predicate("limit is positive", firstPage.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  // 3. If there are records and multiple pages, test second page pagination
  if (firstPage.data.length > 0 && firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.ecommerceMall.customer.cancellation_requests.index(
        customerConnection,
        {
          body: {
            limit: firstPage.pagination.limit,
            page: 2,
          } satisfies IEcommerceMallCancellationRequest.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals("page 2 current", secondPage.pagination.current, 2);
    TestValidator.equals(
      "same limit",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    TestValidator.equals(
      "same total records",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
  }
  // 4. Test date range filtering with createdAtFrom
  const now = new Date();
  const fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const fromDateFiltered =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          createdAtFrom: fromDate.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(fromDateFiltered);
  // 5. Test date range filtering with createdAtTo
  const toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
  const toDateFiltered =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          createdAtTo: toDate.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(toDateFiltered);
  // 6. Test combined date range filtering
  const combinedFiltered =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          createdAtFrom: fromDate.toISOString(),
          createdAtTo: toDate.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // 7. Test edge case: empty result with restrictive date filter
  const oldDate = new Date(2020, 0, 1);
  const emptyResult =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          createdAtFrom: oldDate.toISOString(),
          createdAtTo: oldDate.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(emptyResult);
  // Edge case validations - empty result set
  TestValidator.equals("empty data array", emptyResult.data.length, 0);
  TestValidator.equals("records is 0", emptyResult.pagination.records, 0);
  TestValidator.equals("pages is 0", emptyResult.pagination.pages, 0);
}
