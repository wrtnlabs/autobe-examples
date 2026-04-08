import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
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
 * Test the seller's ability to search and filter refund requests with various criteria.
 * The scenario verifies:
 *
 * 1. **Prerequisites**: Authenticate as a seller
 * 2. **Test Execution**: Call the refund request search endpoint with filters such as:
 *    - Status filter (pending, approved, rejected)
 *    - Date range filter (requestedAtFrom, requestedAtTo)
 *    - Search by order item reference
 *    - Pagination with page and limit parameters
 *
 * 3. **Validation Points**:
 *    - Response returns a paginated list (IPageIEcommerceMallRefundRequest.ISummary)
 *    - Each summary item contains: id, status, reason, order item reference, customer info, createdAt
 *    - Pagination metadata is correct (total count, current page, total pages)
 *    - Filters are applied correctly - results match the specified criteria
 *    - Response time is acceptable
 *
 * 4. **Edge Cases**:
 *    - Filter by specific status (e.g., only PENDING) returns only matching requests
 *    - Date range filtering works correctly with ISO format dates
 *    - Combining multiple filters works as expected (AND logic)
 */
export async function test_api_seller_refund_request_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as a seller using the utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Test: Search refund requests without filters (default pagination)
  const searchWithoutFilters =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchWithoutFilters);
  // Validate pagination structure even if data is empty
  TestValidator.equals(
    "pagination current page is 1",
    searchWithoutFilters.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    searchWithoutFilters.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    searchWithoutFilters.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    searchWithoutFilters.pagination.pages >= 0,
  );
  // 3. Test: Filter by status = "pending"
  const searchByPendingStatus =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchByPendingStatus);
  // Validate all returned items match the filtered status
  TestValidator.predicate(
    "all results have pending status when filtered",
    searchByPendingStatus.data.every((item) => item.status === "pending"),
  );
  // 4. Test: Filter by status = "approved"
  const searchByApprovedStatus =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchByApprovedStatus);
  TestValidator.predicate(
    "all results have approved status when filtered",
    searchByApprovedStatus.data.every((item) => item.status === "approved"),
  );
  // 5. Test: Filter by status = "rejected"
  const searchByRejectedStatus =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchByRejectedStatus);
  TestValidator.predicate(
    "all results have rejected status when filtered",
    searchByRejectedStatus.data.every((item) => item.status === "rejected"),
  );
  // 6. Test: Date range filtering with ISO 8601 format
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const searchByDateRange =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          requestedAtFrom: oneDayAgo.toISOString(),
          requestedAtTo: oneDayLater.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchByDateRange);
  // 7. Test: Combined filters (status + date range + pagination)
  const searchWithCombinedFilters =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          requestedAtFrom: oneDayAgo.toISOString(),
          requestedAtTo: oneDayLater.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchWithCombinedFilters);
  TestValidator.equals(
    "combined filter pagination limit is 5",
    searchWithCombinedFilters.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "combined filter results have pending status",
    searchWithCombinedFilters.data.every((item) => item.status === "pending"),
  );
  // 8. Test: Pagination with different page sizes
  const searchWithMaxLimit =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchWithMaxLimit);
  TestValidator.equals(
    "pagination limit is 100 (max allowed)",
    searchWithMaxLimit.pagination.limit,
    100,
  );
  // 9. Test: Order item ID filtering
  const searchByOrderItemId =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchByOrderItemId);
  // 10. Test: Second page pagination
  const searchSecondPage =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchSecondPage);
  TestValidator.equals(
    "second page pagination current is 2",
    searchSecondPage.pagination.current,
    2,
  );
}
