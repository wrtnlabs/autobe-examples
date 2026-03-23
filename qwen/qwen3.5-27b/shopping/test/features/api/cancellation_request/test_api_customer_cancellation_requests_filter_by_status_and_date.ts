import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that a customer can filter their cancellation requests by status and date ranges.
 *
 * This test validates the filtering capabilities of the cancellation requests
 * endpoint, including status filtering, date range filtering, and sorting options.
 */
export async function test_api_customer_cancellation_requests_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Test default behavior (no filters)
  const defaultResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default pagination current is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit is 20",
    defaultResult.pagination.limit,
    20,
  );
  // 3. Test status filter - pending
  const pendingFilterResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingFilterResult);
  TestValidator.predicate(
    "pending filter returns only pending status",
    pendingFilterResult.data.every((req) => req.status === "pending"),
  );
  // 4. Test status filter - approved
  const approvedFilterResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedFilterResult);
  TestValidator.predicate(
    "approved filter returns only approved status",
    approvedFilterResult.data.every((req) => req.status === "approved"),
  );
  // 5. Test status filter - rejected
  const rejectedFilterResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedFilterResult);
  TestValidator.predicate(
    "rejected filter returns only rejected status",
    rejectedFilterResult.data.every((req) => req.status === "rejected"),
  );
  // 6. Test requested_at_from filter
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7); // 7 days ago
  const fromFilterResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          requested_at_from: fromDate.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(fromFilterResult);
  TestValidator.predicate(
    "requested_at_from filter returns only requests from that date onwards",
    fromFilterResult.data.every((req) => new Date(req.requestedAt) >= fromDate),
  );
  // 7. Test requested_at_to filter
  const toDate = new Date();
  toDate.setDate(toDate.getDate() - 1); // 1 day ago
  const toFilterResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          requested_at_to: toDate.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(toFilterResult);
  TestValidator.predicate(
    "requested_at_to filter returns only requests up to that date",
    toFilterResult.data.every((req) => new Date(req.requestedAt) <= toDate),
  );
  // 8. Test combined filters (status + date range)
  const combinedFilterResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          status: "pending",
          requested_at_from: fromDate.toISOString(),
          requested_at_to: toDate.toISOString(),
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter returns only pending requests within date range",
    combinedFilterResult.data.every(
      (req) =>
        req.status === "pending" &&
        new Date(req.requestedAt) >= fromDate &&
        new Date(req.requestedAt) <= toDate,
    ),
  );
  // 9. Test sorting by responded_at ascending
  const sortedResult =
    await api.functional.shoppingMall.customer.cancellationRequests.index(
      customerConnection,
      {
        body: {
          sortBy: "responded_at",
          sortOrder: "asc",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorting by responded_at ascending works correctly",
    sortedResult.data.every((req, index, array) => {
      if (index === 0) return true;
      const prev = array[index - 1];
      const curr = req;
      // Handle null values (pending requests have null responded_at)
      if (prev.respondedAt === null && curr.respondedAt === null) return true;
      if (prev.respondedAt === null) return false;
      if (curr.respondedAt === null) return true;
      return new Date(prev.respondedAt) <= new Date(curr.respondedAt);
    }),
  );
  // 10. Test pagination metadata consistency
  TestValidator.predicate(
    "pagination records matches data length",
    pendingFilterResult.pagination.records === pendingFilterResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    pendingFilterResult.pagination.pages ===
      Math.ceil(
        pendingFilterResult.pagination.records /
          pendingFilterResult.pagination.limit,
      ),
  );
}
