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

/**
 * Test filtering refund requests by status and date range.
 * Validates customer can filter their refund requests by:
 * - Status (pending, approved, rejected)
 * - Date range (createdAfter, createdBefore)
 * - Combined filters
 */
export async function test_api_customer_refund_requests_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup with isolated connection
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com/register",
      referrer: "https://test.example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Test status filter: pending
  const pendingFilter = {
    status: "pending",
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const pendingResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerConnection,
      {
        body: pendingFilter,
      },
    );
  typia.assert(pendingResponse);
  typia.assert(pendingResponse.data);
  // 3. Test status filter: approved
  const approvedFilter = {
    status: "approved",
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const approvedResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerConnection,
      {
        body: approvedFilter,
      },
    );
  typia.assert(approvedResponse);
  typia.assert(approvedResponse.data);
  // 4. Test status filter: rejected
  const rejectedFilter = {
    status: "rejected",
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const rejectedResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerConnection,
      {
        body: rejectedFilter,
      },
    );
  typia.assert(rejectedResponse);
  typia.assert(rejectedResponse.data);
  // 5. Test date range filter: createdAfter
  const now = new Date();
  const pastDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFilter = {
    createdAfter: pastDate,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const dateResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerConnection,
      {
        body: dateFilter,
      },
    );
  typia.assert(dateResponse);
  typia.assert(dateResponse.data);
  // 6. Test date range filter: createdBefore
  const futureDate = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const beforeFilter = {
    createdBefore: futureDate,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const beforeResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerConnection,
      {
        body: beforeFilter,
      },
    );
  typia.assert(beforeResponse);
  typia.assert(beforeResponse.data);
  // 7. Test combined status and date filters
  const combinedFilter = {
    status: "pending",
    createdAfter: pastDate,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const combinedResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerConnection,
      {
        body: combinedFilter,
      },
    );
  typia.assert(combinedResponse);
  typia.assert(combinedResponse.data);
  // 8. Test pagination parameters
  const paginationFilter = {
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const paginationResponse =
    await api.functional.ecommerceMall.customer.refund_requests.status.index(
      customerConnection,
      {
        body: paginationFilter,
      },
    );
  typia.assert(paginationResponse);
  typia.assert(paginationResponse.data);
  // Validate pagination structure
  TestValidator.equals(
    "pagination: current page is 1",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination: limit is 10",
    paginationResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination: records is number",
    () => typeof paginationResponse.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination: pages is number",
    () => typeof paginationResponse.pagination.pages === "number",
  );
  // Validate response structure
  TestValidator.equals(
    "pending: has pagination object",
    pendingResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "pending: has data array",
    Array.isArray(pendingResponse.data),
    true,
  );
  TestValidator.equals(
    "approved: has data array",
    Array.isArray(approvedResponse.data),
    true,
  );
  TestValidator.equals(
    "rejected: has data array",
    Array.isArray(rejectedResponse.data),
    true,
  );
}