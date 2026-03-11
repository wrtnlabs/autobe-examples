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

export async function test_api_customer_cancellation_requests_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins/register to create an account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.Format<"email"> &
        tags.MinLength<1> &
        tags.MaxLength<255>,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create new connection with customer token
  const customerAuthConnection: api.IConnection = { host: connection.host };
  customerAuthConnection.headers = {
    Authorization: customerAuth.token.access,
  };
  // 2. Test retrieving cancellation requests with status filter
  const pendingResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerAuthConnection,
      {
        body: {
          status: "pending",
          sortBy: "createdAt" as const,
          sortOrder: "desc" as const,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    pendingResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    pendingResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pendingResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pendingResponse.pagination.pages >= 0,
  );
  // 4. Validate all requests belong to authenticated customer
  for (const request of pendingResponse.data) {
    typia.assert(request);
    TestValidator.equals(
      "customer email matches",
      request.customer.email,
      customerAuth.email,
    );
    TestValidator.equals(
      "customer display name present",
      request.customer.display_name.length > 0,
      true,
    );
  }
  // 5. Test retrieving with different page
  const secondPageResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerAuthConnection,
      {
        body: {
          status: "pending",
          sortBy: "createdAt" as const,
          sortOrder: "desc" as const,
          page: 2,
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page current page",
    secondPageResponse.pagination.current,
    2,
  );
  // 6. Test sorting by createdAt ascending
  const ascendingResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerAuthConnection,
      {
        body: {
          sortBy: "createdAt" as const,
          sortOrder: "asc" as const,
          limit: 50,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(ascendingResponse);
  // 7. Test filtering by different statuses
  const approvedResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerAuthConnection,
      {
        body: {
          status: "approved",
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedResponse);
  const rejectedResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerAuthConnection,
      {
        body: {
          status: "rejected",
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  // 8. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerAuthConnection,
      {
        body: {
          startDate: oneWeekAgo.toISOString(),
          endDate: now.toISOString(),
          limit: 20,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 9. Validate response structure - each request has required fields
  for (const request of pendingResponse.data) {
    TestValidator.predicate(
      "request has valid id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.id,
      ),
    );
    TestValidator.equals(
      "request has customer context",
      request.customer.id.length > 0,
      true,
    );
    TestValidator.equals(
      "request has orderItem context",
      request.orderItem.id.length > 0,
      true,
    );
    TestValidator.equals(
      "request has orderItem item_status",
      typeof request.orderItem.item_status === "string",
      true,
    );
    TestValidator.equals(
      "request has orderItem quantity",
      typeof request.orderItem.quantity === "number",
      true,
    );
    TestValidator.equals(
      "request has orderItem unit_price",
      typeof request.orderItem.unit_price === "number",
      true,
    );
    TestValidator.predicate(
      "request has valid reason",
      request.reason.length > 0,
    );
    TestValidator.predicate(
      "request has valid request_status",
      ["pending", "approved", "rejected"].includes(request.request_status),
    );
    TestValidator.predicate(
      "request has valid created_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(request.created_at),
    );
    TestValidator.predicate(
      "request has valid updated_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(request.updated_at),
    );
  }
  // 10. Test limit parameter validation
  const smallLimitResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerAuthConnection,
      {
        body: {
          limit: 5,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(smallLimitResponse);
  TestValidator.predicate(
    "limit 5 results have max 5 items",
    smallLimitResponse.data.length <= 5,
  );
}
