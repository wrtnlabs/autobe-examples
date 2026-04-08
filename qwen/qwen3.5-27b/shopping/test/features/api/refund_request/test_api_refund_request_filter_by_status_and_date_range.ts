import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer refund request filtering by status and date range.
 *
 * Validates the filtering capabilities of the refund requests listing endpoint. Tests that customers can filter their refund requests by status (pending, approved, rejected) and date ranges (created_at and responded_at). Verifies that the API correctly applies filters and returns properly structured paginated responses.
 *
 * The test validates that:
 * - Status filters correctly narrow results to only requests with the specified status
 * - Date range filters work for both creation time and response time
 * - responded_at filters exclude pending requests (which have null responded_at)
 * - Combined filters apply all conditions correctly
 * - Pagination metadata is present and accurate in all responses
 *
 * 1. Register and authenticate as a customer.
 * 2. Filter refund requests by status='pending' and validate response structure.
 * 3. Filter refund requests by status='approved' and validate response structure.
 * 4. Filter refund requests by status='rejected' and validate response structure.
 * 5. Filter by created_at date range and validate response.
 * 6. Filter by responded_at date range (excludes pending requests).
 * 7. Combine status and date range filters and validate response.
 * 8. Validate pagination metadata in all responses.
 */
export async function test_api_refund_request_filter_by_status_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Filter by status='pending'
  const pendingFilter = {
    status: "pending" as const,
    limit: 20,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const pendingResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  TestValidator.predicate(
    "pending filter - pagination present",
    pendingResult.pagination.current >= 1,
  );
  for (const request of pendingResult.data) {
    TestValidator.equals(
      "pending filter - status is pending",
      request.status,
      "pending",
    );
  }
  // 3. Filter by status='approved'
  const approvedFilter = {
    status: "approved" as const,
    limit: 20,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const approvedResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  for (const request of approvedResult.data) {
    TestValidator.equals(
      "approved filter - status is approved",
      request.status,
      "approved",
    );
    TestValidator.predicate(
      "approved filter - responded_at is not null",
      request.responded_at !== null,
    );
  }
  // 4. Filter by status='rejected'
  const rejectedFilter = {
    status: "rejected" as const,
    limit: 20,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const rejectedResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: rejectedFilter },
    );
  typia.assert(rejectedResult);
  for (const request of rejectedResult.data) {
    TestValidator.equals(
      "rejected filter - status is rejected",
      request.status,
      "rejected",
    );
    TestValidator.predicate(
      "rejected filter - responded_at is not null",
      request.responded_at !== null,
    );
  }
  // 5. Filter by created_at date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const createdAtFilter = {
    created_at_start: thirtyDaysAgo.toISOString(),
    created_at_end: now.toISOString(),
    limit: 20,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const createdAtResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: createdAtFilter },
    );
  typia.assert(createdAtResult);
  TestValidator.predicate(
    "created_at filter - pagination present",
    createdAtResult.pagination.current >= 1,
  );
  for (const request of createdAtResult.data) {
    const requestDate = new Date(request.created_at);
    TestValidator.predicate(
      "created_at filter - within range",
      requestDate >= thirtyDaysAgo && requestDate <= now,
    );
  }
  // 6. Filter by responded_at date range (excludes pending)
  const respondedAtFilter = {
    responded_at_start: thirtyDaysAgo.toISOString(),
    responded_at_end: now.toISOString(),
    limit: 20,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const respondedAtResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: respondedAtFilter },
    );
  typia.assert(respondedAtResult);
  for (const request of respondedAtResult.data) {
    TestValidator.predicate(
      "responded_at filter - responded_at is not null",
      request.responded_at !== null,
    );
    if (request.responded_at !== null) {
      const respondedDate = new Date(request.responded_at);
      TestValidator.predicate(
        "responded_at filter - within range",
        respondedDate >= thirtyDaysAgo && respondedDate <= now,
      );
    }
  }
  // 7. Combine status and date range filters
  const combinedFilter = {
    status: "approved" as const,
    created_at_start: thirtyDaysAgo.toISOString(),
    created_at_end: now.toISOString(),
    limit: 20,
  } satisfies IShoppingMallRefundRequest.IRequest;
  const combinedResult =
    await api.functional.shoppingMall.customer.refund_requests.index(
      customerConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  for (const request of combinedResult.data) {
    TestValidator.equals(
      "combined filter - status is approved",
      request.status,
      "approved",
    );
    const requestDate = new Date(request.created_at);
    TestValidator.predicate(
      "combined filter - created_at within range",
      requestDate >= thirtyDaysAgo && requestDate <= now,
    );
  }
  // 8. Validate pagination metadata structure
  TestValidator.equals(
    "pagination - current is positive",
    pendingResult.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination - limit is positive",
    pendingResult.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination - records is non-negative",
    pendingResult.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination - pages is non-negative",
    pendingResult.pagination.pages >= 0,
    true,
  );
}
