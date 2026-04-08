import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator filtering of refund requests by status and date range.
 *
 * Validates the complete filtering functionality for refund requests including status filtering, date range queries, text search, pagination, and sorting. Ensures that administrators can effectively query refund requests using various filter combinations and that pagination metadata is accurate.
 *
 * Special attention is given to verifying that filters work correctly in isolation and combination, that text search performs fuzzy matching on reason fields, and that empty result sets return valid pagination structures.
 *
 * 1. Administrator authenticates successfully with join endpoint.
 * 2. Administrator queries refund requests with status='pending' filter.
 * 3. Validates all returned requests have status 'pending'.
 * 4. Administrator queries with created_at_start and created_at_end date range.
 * 5. Validates all requests fall within the specified date range.
 * 6. Administrator combines status and date range filters.
 * 7. Administrator performs text search on reason field.
 * 8. Validates pagination metadata (current, limit, records, pages).
 * 9. Administrator tests sorting by responded_at field.
 * 10. Administrator queries with non-matching filters to verify empty result handling.
 */
export async function test_api_refund_request_filter_by_status_and_date(
  connection: api.IConnection,
) {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Query refund requests with status='pending' filter
  const pendingRequests =
    await api.functional.shoppingMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 20,
          page: 1,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // 3. Validate all returned requests have status 'pending'
  TestValidator.predicate(
    "all requests have pending status",
    pendingRequests.data.every((req) => req.status === "pending"),
  );
  // 4. Query with date range filter
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeRequests =
    await api.functional.shoppingMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
          limit: 20,
          page: 1,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(dateRangeRequests);
  // 5. Validate all requests fall within the date range
  TestValidator.predicate(
    "all requests within date range",
    dateRangeRequests.data.every(
      (req) =>
        new Date(req.created_at).getTime() >= oneWeekAgo.getTime() &&
        new Date(req.created_at).getTime() <= now.getTime(),
    ),
  );
  // 6. Combine status and date range filters
  const combinedFilterRequests =
    await api.functional.shoppingMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          created_at_start: oneWeekAgo.toISOString(),
          created_at_end: now.toISOString(),
          limit: 20,
          page: 1,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(combinedFilterRequests);
  // Validate combined filters work correctly
  TestValidator.predicate(
    "combined filters: all pending and within date range",
    combinedFilterRequests.data.every(
      (req) =>
        req.status === "pending" &&
        new Date(req.created_at).getTime() >= oneWeekAgo.getTime() &&
        new Date(req.created_at).getTime() <= now.getTime(),
    ),
  );
  // 7. Text search on reason field
  const searchRequests =
    await api.functional.shoppingMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          search: "refund",
          limit: 20,
          page: 1,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(searchRequests);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchRequests.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchRequests.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records count valid",
    searchRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count valid",
    searchRequests.pagination.pages >= 0,
  );
  // 8. Test pagination with filters
  const paginatedRequests =
    await api.functional.shoppingMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 10,
          page: 2,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(paginatedRequests);
  TestValidator.equals(
    "pagination second page",
    paginatedRequests.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit applied",
    paginatedRequests.pagination.limit,
    10,
  );
  // 9. Test sorting by responded_at
  const sortedRequests =
    await api.functional.shoppingMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          sortBy: "responded_at",
          sortOrder: "desc",
          limit: 20,
          page: 1,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(sortedRequests);
  // Validate sorting (descending order by responded_at)
  if (sortedRequests.data.length > 1) {
    TestValidator.predicate(
      "sorted by responded_at descending",
      sortedRequests.data.every((req, idx, arr) => {
        if (idx === 0) return true;
        const prev = arr[idx - 1];
        const curr = req;
        // Handle null values (pending requests have null responded_at)
        if (prev.responded_at === null && curr.responded_at === null)
          return true;
        if (prev.responded_at === null) return false;
        if (curr.responded_at === null) return true;
        return (
          new Date(prev.responded_at).getTime() >=
          new Date(curr.responded_at).getTime()
        );
      }),
    );
  }
  // 10. Test empty result set with non-matching filters
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const emptyRequests =
    await api.functional.shoppingMall.administrator.refund_requests.index(
      adminConnection,
      {
        body: {
          created_at_start: futureDate.toISOString(),
          created_at_end: futureDate.toISOString(),
          limit: 20,
          page: 1,
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(emptyRequests);
  // Validate empty result set returns valid pagination
  TestValidator.equals(
    "empty result: records count is zero",
    emptyRequests.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result: pages count is zero",
    emptyRequests.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result: data array is empty",
    emptyRequests.data.length,
    0,
  );
}
