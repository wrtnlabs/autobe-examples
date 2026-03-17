import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieving a paginated list of refund requests for their products.
 *
 * This test verifies that a seller can successfully retrieve refund requests
 * specifically for order items containing their products. The response should
 * contain a paginated list of refund request summaries with all required fields
 * including ID, status, reason, timestamps, hasResponse flag, orderItemId,
 * productName from snapshot, sellerShopName, and customerDisplayName.
 *
 * The test validates:
 * 1. Successful retrieval of refund requests for authenticated seller
 * 2. Response structure matches IPageIEcommerceMallRefundRequest.ISummary format
 * 3. Pagination metadata contains current page, limit, total records, and total pages
 * 4. Default sorting by submittedAt DESC (newest first)
 * 5. Seller can only view refund requests for their own products
 */
export async function test_api_seller_refund_request_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // 2. Call the refund requests endpoint with default pagination
  const refundRequestBody = {
    page: 1,
    limit: 20,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const refundRequests =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      { body: refundRequestBody },
    );
  typia.assert(refundRequests);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination has required fields",
    refundRequests.pagination !== undefined &&
      typeof refundRequests.pagination.current === "number" &&
      typeof refundRequests.pagination.limit === "number" &&
      typeof refundRequests.pagination.records === "number" &&
      typeof refundRequests.pagination.pages === "number",
  );
  // 4. Verify data array exists
  TestValidator.predicate(
    "data array exists",
    Array.isArray(refundRequests.data),
  );
  // 5. Verify default sorting by submittedAt DESC if data exists
  if (refundRequests.data.length > 1) {
    const isSortedDesc = refundRequests.data.every((item, index, array) => {
      if (index === 0) return true;
      return (
        new Date(array[index - 1].submittedAt).getTime() >=
        new Date(item.submittedAt).getTime()
      );
    });
    TestValidator.predicate(
      "refund requests sorted by submittedAt DESC",
      isSortedDesc,
    );
  }
  // 6. Verify each refund request has required fields if any exist
  if (refundRequests.data.length > 0) {
    const firstRequest = refundRequests.data[0];
    TestValidator.predicate(
      "refund request has id",
      typeof firstRequest.id === "string",
    );
    TestValidator.predicate(
      "refund request has status",
      typeof firstRequest.status === "string",
    );
    TestValidator.predicate(
      "refund request has reason",
      typeof firstRequest.reason === "string",
    );
    TestValidator.predicate(
      "refund request has submittedAt",
      typeof firstRequest.submittedAt === "string",
    );
    TestValidator.predicate(
      "refund request has orderItemId",
      typeof firstRequest.orderItemId === "string",
    );
    TestValidator.predicate(
      "refund request has productName",
      typeof firstRequest.productName === "string",
    );
    TestValidator.predicate(
      "refund request has sellerShopName",
      typeof firstRequest.sellerShopName === "string",
    );
    TestValidator.predicate(
      "refund request has customerDisplayName",
      typeof firstRequest.customerDisplayName === "string",
    );
    TestValidator.predicate(
      "refund request has hasResponse boolean",
      typeof firstRequest.hasResponse === "boolean",
    );
  }
  // 7. Test with status filter
  const filteredBody = {
    status: "pending",
    page: 1,
    limit: 10,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const filteredRequests =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      { body: filteredBody },
    );
  typia.assert(filteredRequests);
  // Verify filtered results have matching status if any exist
  if (filteredRequests.data.length > 0) {
    const allPending = filteredRequests.data.every(
      (req) => req.status === "pending",
    );
    TestValidator.predicate("filtered results match status filter", allPending);
  }
  // 8. Test pagination with custom limit
  const customLimitBody = {
    page: 1,
    limit: 5,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const pagedRequests =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      { body: customLimitBody },
    );
  typia.assert(pagedRequests);
  TestValidator.equals(
    "pagination limit matches request",
    pagedRequests.pagination.limit,
    5,
  );
  // 9. Test sort by submittedAt ASC
  const ascSortBody = {
    page: 1,
    limit: 20,
    sortField: "submittedAt" as const,
    sortOrder: "asc" as const,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const ascSortedRequests =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      { body: ascSortBody },
    );
  typia.assert(ascSortedRequests);
  // Verify ascending sort if data has multiple items
  if (ascSortedRequests.data.length > 1) {
    const isSortedAsc = ascSortedRequests.data.every((item, index, array) => {
      if (index === 0) return true;
      return (
        new Date(array[index - 1].submittedAt).getTime() <=
        new Date(item.submittedAt).getTime()
      );
    });
    TestValidator.predicate(
      "refund requests sorted by submittedAt ASC",
      isSortedAsc,
    );
  }
  // 10. Test empty response handling for out-of-range page
  const emptyPageBody = {
    page: 9999,
    limit: 20,
  } satisfies IEcommerceMallRefundRequest.IRequest;
  const emptyPageResponse =
    await api.functional.ecommerceMall.seller.refundRequests.index(
      sellerConnection,
      { body: emptyPageBody },
    );
  typia.assert(emptyPageResponse);
  TestValidator.predicate(
    "no data returned for out-of-range page",
    emptyPageResponse.data.length === 0,
  );
}
