import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_customer_refund_request_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuth);
  // 2. Generate an order item ID for testing
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test basic search without filters
  const basicSearch =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(basicSearch);
  TestValidator.equals(
    "basic search page is 1",
    basicSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "basic search limit is 10",
    basicSearch.pagination.limit,
    10,
  );
  // 4. Test status filtering - pending
  const pendingSearch =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          status: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingSearch);
  TestValidator.equals(
    "pending filter page is 1",
    pendingSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pending filter limit is 20",
    pendingSearch.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "all pending results have pending status",
    pendingSearch.data.every((item) => item.status === "pending"),
  );
  // 5. Test status filtering - approved
  const approvedSearch =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          status: "approved",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedSearch);
  TestValidator.predicate(
    "all approved results have approved status",
    approvedSearch.data.every((item) => item.status === "approved"),
  );
  // 6. Test status filtering - rejected
  const rejectedSearch =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          status: "rejected",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedSearch);
  TestValidator.predicate(
    "all rejected results have rejected status",
    rejectedSearch.data.every((item) => item.status === "rejected"),
  );
  // 7. Test date range filtering
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeSearch =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          requestedAtFrom: oneMonthAgo.toISOString(),
          requestedAtTo: oneWeekAgo.toISOString(),
          page: 1,
          limit: 50,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateRangeSearch);
  TestValidator.predicate(
    "all results within date range",
    dateRangeSearch.data.every((item) => {
      const requestedAt = new Date(item.requestedAt).getTime();
      return (
        requestedAt >= oneMonthAgo.getTime() &&
        requestedAt <= oneWeekAgo.getTime()
      );
    }),
  );
  // 8. Test combined filtering (status + date range)
  const combinedSearch =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          status: "pending",
          requestedAtFrom: oneMonthAgo.toISOString(),
          requestedAtTo: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined filter results have correct status",
    combinedSearch.data.every((item) => item.status === "pending"),
  );
  TestValidator.predicate(
    "combined filter results within date range",
    combinedSearch.data.every((item) => {
      const requestedAt = new Date(item.requestedAt).getTime();
      return (
        requestedAt >= oneMonthAgo.getTime() && requestedAt <= now.getTime()
      );
    }),
  );
  // 9. Test pagination with different page sizes
  const page1 =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit is 5", page1.pagination.limit, 5);
  const page2 =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.index(
      customerConnection,
      {
        orderItemId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit is 5", page2.pagination.limit, 5);
  TestValidator.equals(
    "page 1 and 2 have same records",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 1 and 2 have same pages",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  // 10. Validate refund request summary structure if data exists
  if (basicSearch.data.length > 0) {
    const firstItem = basicSearch.data[0];
    TestValidator.predicate("refund request has id", !!firstItem.id);
    TestValidator.predicate(
      "refund request has reason",
      typeof firstItem.reason === "string",
    );
    TestValidator.predicate(
      "refund request has valid status",
      ["pending", "approved", "rejected"].includes(firstItem.status),
    );
    TestValidator.predicate(
      "refund request has requestedAt",
      !!firstItem.requestedAt,
    );
    TestValidator.predicate(
      "refund request has orderItemId",
      !!firstItem.orderItemId,
    );
    TestValidator.predicate(
      "refund request has customer",
      !!firstItem.customer,
    );
    TestValidator.predicate("refund request has seller", !!firstItem.seller);
  }
}
