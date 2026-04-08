import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
 * Test administrator filtering of cancellation requests by status and creation date range.
 *
 * Validates that an authenticated administrator can filter cancellation requests using status and date range parameters. The test verifies that filtering logic correctly returns only matching requests and that pagination metadata accurately reflects the filtered result set.
 *
 * This test covers multiple filtering scenarios: status-only filtering, date range-only filtering, and combined filtering. Each scenario validates the response structure, pagination information, and data integrity.
 *
 * 1. Administrator authenticates to the shopping mall platform.
 * 2. Test filtering by status='pending' with date range.
 * 3. Test filtering by status='approved' with same date range.
 * 4. Test filtering by status='rejected' with same date range.
 * 5. Test filtering by date range only (no status filter).
 * 6. Test with no filters (should return all requests).
 * 7. Validate response structure, pagination metadata, and data integrity for each filter combination.
 */
export async function test_api_administrator_cancellation_requests_filter_by_status_and_date(
  connection: api.IConnection,
) {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Define date range for testing
  const fromDate = "2026-04-01T00:00:00Z";
  const toDate = "2026-04-30T23:59:59Z";
  // 2. Test filtering by status='pending' with date range
  const pendingRequests =
    await api.functional.shoppingMall.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
          createdAt: { from: fromDate, to: toDate },
          page: 1,
          limit: 20,
          sort: "-createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Validate pagination metadata
  TestValidator.predicate(
    "pending requests pagination current page",
    pendingRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pending requests pagination limit",
    pendingRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pending requests pagination records non-negative",
    pendingRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pending requests pagination pages non-negative",
    pendingRequests.pagination.pages >= 0,
  );
  // Validate each cancellation request in response
  for (const request of pendingRequests.data) {
    TestValidator.equals(
      "cancellation request status is pending",
      request.status,
      "pending",
    );
    TestValidator.predicate(
      "cancellation request has valid ID",
      request.id !== null && request.id !== undefined,
    );
    TestValidator.predicate(
      "cancellation request has reason",
      request.reason !== null && request.reason !== undefined,
    );
    TestValidator.predicate(
      "cancellation request has created_at",
      request.created_at !== null && request.created_at !== undefined,
    );
    TestValidator.predicate(
      "cancellation request has customer",
      request.customer !== null && request.customer !== undefined,
    );
    TestValidator.predicate(
      "cancellation request has orderItem",
      request.orderItem !== null && request.orderItem !== undefined,
    );
  }
  // 3. Test filtering by status='approved' with same date range
  const approvedRequests =
    await api.functional.shoppingMall.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
          createdAt: { from: fromDate, to: toDate },
          page: 1,
          limit: 20,
          sort: "-createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // Validate pagination metadata
  TestValidator.predicate(
    "approved requests pagination current page",
    approvedRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "approved requests pagination limit",
    approvedRequests.pagination.limit > 0,
  );
  // Validate each cancellation request in response
  for (const request of approvedRequests.data) {
    TestValidator.equals(
      "cancellation request status is approved",
      request.status,
      "approved",
    );
    TestValidator.predicate(
      "approved request has response_reason or null",
      request.response_reason === null ||
        typeof request.response_reason === "string",
    );
  }
  // 4. Test filtering by status='rejected' with same date range
  const rejectedRequests =
    await api.functional.shoppingMall.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          createdAt: { from: fromDate, to: toDate },
          page: 1,
          limit: 20,
          sort: "-createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // Validate pagination metadata
  TestValidator.predicate(
    "rejected requests pagination current page",
    rejectedRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "rejected requests pagination limit",
    rejectedRequests.pagination.limit > 0,
  );
  // Validate each cancellation request in response
  for (const request of rejectedRequests.data) {
    TestValidator.equals(
      "cancellation request status is rejected",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "rejected request has response_reason or null",
      request.response_reason === null ||
        typeof request.response_reason === "string",
    );
  }
  // 5. Test filtering by date range only (no status filter)
  const dateRangeRequests =
    await api.functional.shoppingMall.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          createdAt: { from: fromDate, to: toDate },
          page: 1,
          limit: 20,
          sort: "-createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(dateRangeRequests);
  // Validate pagination metadata
  TestValidator.predicate(
    "date range requests pagination current page",
    dateRangeRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "date range requests pagination limit",
    dateRangeRequests.pagination.limit > 0,
  );
  // Validate that all requests have valid status
  for (const request of dateRangeRequests.data) {
    TestValidator.predicate(
      "request status is valid enum value",
      request.status === "pending" ||
        request.status === "approved" ||
        request.status === "rejected",
    );
  }
  // 6. Test with no filters (should return all requests)
  const allRequests =
    await api.functional.shoppingMall.administrator.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "-createdAt",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // Validate pagination metadata
  TestValidator.predicate(
    "all requests pagination current page",
    allRequests.pagination.current >= 1,
  );
  TestValidator.predicate(
    "all requests pagination limit",
    allRequests.pagination.limit > 0,
  );
  TestValidator.predicate(
    "all requests pagination records non-negative",
    allRequests.pagination.records >= 0,
  );
  // Validate each cancellation request in response
  for (const request of allRequests.data) {
    TestValidator.predicate(
      "request has valid ID",
      request.id !== null && request.id !== undefined,
    );
    TestValidator.predicate(
      "request has valid status",
      request.status === "pending" ||
        request.status === "approved" ||
        request.status === "rejected",
    );
    TestValidator.predicate(
      "request has customer",
      request.customer !== null && request.customer !== undefined,
    );
    TestValidator.predicate(
      "request has orderItem",
      request.orderItem !== null && request.orderItem !== undefined,
    );
  }
  // 7. Validate that filtered results are subsets of all results
  TestValidator.predicate(
    "pending requests count <= all requests count",
    pendingRequests.pagination.records <= allRequests.pagination.records,
  );
  TestValidator.predicate(
    "approved requests count <= all requests count",
    approvedRequests.pagination.records <= allRequests.pagination.records,
  );
  TestValidator.predicate(
    "rejected requests count <= all requests count",
    rejectedRequests.pagination.records <= allRequests.pagination.records,
  );
  TestValidator.predicate(
    "date range requests count <= all requests count",
    dateRangeRequests.pagination.records <= allRequests.pagination.records,
  );
}
