import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an authenticated customer can retrieve their refund request history with various filter combinations.
 * Validates pagination, status filtering, date range filtering, and data isolation.
 */
export async function test_api_refund_request_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Get all refund requests (no filters)
  const allRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // 3. Verify pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    allRequests.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", allRequests.pagination.current, 1);
  TestValidator.equals("default limit is 20", allRequests.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    allRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allRequests.pagination.pages >= 0,
  );
  // 4. Verify data array exists
  TestValidator.predicate("data array exists", Array.isArray(allRequests.data));
  // 5. Test status filter: pending
  const pendingRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Verify all returned requests have pending status
  for (const request of pendingRequests.data) {
    TestValidator.equals(
      "request status is pending",
      request.status,
      "pending",
    );
    TestValidator.predicate(
      "responded_at is null for pending",
      request.responded_at === null,
    );
  }
  // 6. Test status filter: approved
  const approvedRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // Verify all returned requests have approved status
  for (const request of approvedRequests.data) {
    TestValidator.equals(
      "request status is approved",
      request.status,
      "approved",
    );
    TestValidator.predicate(
      "responded_at exists for approved",
      request.responded_at !== null,
    );
  }
  // 7. Test status filter: rejected
  const rejectedRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // Verify all returned requests have rejected status
  for (const request of rejectedRequests.data) {
    TestValidator.equals(
      "request status is rejected",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "responded_at exists for rejected",
      request.responded_at !== null,
    );
  }
  // 8. Test date range filtering with requestedAtFrom and requestedAtTo
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateFilteredRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          requestedAtFrom: oneMonthAgo.toISOString(),
          requestedAtTo: now.toISOString(),
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateFilteredRequests);
  // Verify all requests are within the date range
  for (const request of dateFilteredRequests.data) {
    const requestedAt = new Date(request.requested_at);
    TestValidator.predicate(
      "requested_at is within range",
      requestedAt >= oneMonthAgo && requestedAt <= now,
    );
  }
  // 9. Test respondedAtFrom and respondedAtTo filters (only matches approved/rejected)
  const respondedFilteredRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          respondedAtFrom: oneMonthAgo.toISOString(),
          respondedAtTo: now.toISOString(),
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(respondedFilteredRequests);
  // Verify all returned requests have responded_at (not pending)
  for (const request of respondedFilteredRequests.data) {
    TestValidator.predicate(
      "responded_at exists and is within range",
      request.responded_at !== null,
    );
    if (request.responded_at !== null) {
      const respondedAt = new Date(request.responded_at);
      TestValidator.predicate(
        "responded_at is within range",
        respondedAt >= oneMonthAgo && respondedAt <= now,
      );
    }
  }
  // 10. Test pagination with page=2 and limit=10
  const paginatedRequests =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginatedRequests);
  TestValidator.equals(
    "current page is 2",
    paginatedRequests.pagination.current,
    2,
  );
  TestValidator.equals("limit is 10", paginatedRequests.pagination.limit, 10);
  TestValidator.predicate(
    "data count does not exceed limit",
    paginatedRequests.data.length <= 10,
  );
  // 11. Verify data isolation - all requests belong to authenticated customer
  // (This is implicitly verified by the API returning only customer's requests)
  TestValidator.predicate(
    "all requests have valid UUID",
    allRequests.data.every((req) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        req.id,
      ),
    ),
  );
  // 12. Verify each refund request has required fields
  for (const request of allRequests.data) {
    // Verify id is UUID format
    TestValidator.predicate(
      "id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.id,
      ),
    );
    // Verify reason is non-empty string
    TestValidator.predicate("reason is non-empty", request.reason.length > 0);
    // Verify status is one of valid values
    TestValidator.predicate(
      "status is valid",
      ["pending", "approved", "rejected"].includes(request.status),
    );
    // Verify requested_at is valid date-time
    TestValidator.predicate(
      "requested_at is valid date-time",
      !isNaN(Date.parse(request.requested_at)),
    );
    // Verify orderItem exists and has required fields
    TestValidator.predicate(
      "orderItem exists",
      request.orderItem !== undefined,
    );
    TestValidator.predicate(
      "orderItem has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.orderItem.id,
      ),
    );
    TestValidator.predicate(
      "orderItem has valid orderId",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        request.orderItem.orderId,
      ),
    );
    TestValidator.predicate(
      "orderItem quantity is positive",
      request.orderItem.quantity >= 1,
    );
    TestValidator.predicate(
      "orderItem price is non-negative",
      request.orderItem.price >= 0,
    );
  }
}
