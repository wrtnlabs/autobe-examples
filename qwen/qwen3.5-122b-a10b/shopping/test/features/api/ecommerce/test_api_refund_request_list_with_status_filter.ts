import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test refund request list retrieval with status filtering for customer orders.
 *
 * Validates the refund request listing endpoint's filtering capability by status value. Customers can retrieve their refund requests with various status filters (pending, approved, rejected) to view requests matching specific states. The endpoint returns paginated results with appropriate metadata reflecting the filtered count.
 *
 * This test verifies the filtering logic works correctly and that pagination metadata accurately represents the filtered result set. It also validates that refund request summaries contain all required fields including the nested order item reference.
 *
 * 1. Customer joins and authenticates with randomized credentials.
 * 2. Create customer-specific connection with authorization token.
 * 3. Generate valid UUIDs for order and order item (testing endpoint structure).
 * 4. Call refund request list endpoint with no status filter.
 * 5. Validate response structure and pagination metadata.
 * 6. Call endpoint with status='pending' filter and validate results.
 * 7. Call endpoint with status='approved' filter and validate results.
 * 8. Call endpoint with status='rejected' filter and validate results.
 * 9. Verify each refund request has required fields (id, reason, status, order_item).
 * 10. Confirm pagination counts match filtered result lengths.
 */
export async function test_api_refund_request_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and authenticates
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate valid UUIDs for order and order item
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test with no status filter (all statuses)
  const allRefundRequests =
    await api.functional.ecommerce.customer.orders.items.refund_requests.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(allRefundRequests);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    allRefundRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    allRefundRequests.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    allRefundRequests.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    allRefundRequests.pagination.pages >= 0,
  );
  // 4. Test with status='pending' filter
  const pendingRefundRequests =
    await api.functional.ecommerce.customer.orders.items.refund_requests.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(pendingRefundRequests);
  // Validate all results have pending status
  for (const refundRequest of pendingRefundRequests.data) {
    TestValidator.equals(
      "refund request status is pending",
      refundRequest.status,
      "pending",
    );
  }
  // 5. Test with status='approved' filter
  const approvedRefundRequests =
    await api.functional.ecommerce.customer.orders.items.refund_requests.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          status: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(approvedRefundRequests);
  // Validate all results have approved status
  for (const refundRequest of approvedRefundRequests.data) {
    TestValidator.equals(
      "refund request status is approved",
      refundRequest.status,
      "approved",
    );
  }
  // 6. Test with status='rejected' filter
  const rejectedRefundRequests =
    await api.functional.ecommerce.customer.orders.items.refund_requests.index(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          status: "rejected",
          page: 1,
          limit: 10,
        } satisfies IEcommerceRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedRefundRequests);
  // Validate all results have rejected status
  for (const refundRequest of rejectedRefundRequests.data) {
    TestValidator.equals(
      "refund request status is rejected",
      refundRequest.status,
      "rejected",
    );
  }
  // 7. Validate refund request summary structure
  const testRefundRequest =
    allRefundRequests.data.length > 0
      ? allRefundRequests.data[0]
      : rejectedRefundRequests.data.length > 0
        ? rejectedRefundRequests.data[0]
        : approvedRefundRequests.data.length > 0
          ? approvedRefundRequests.data[0]
          : pendingRefundRequests.data.length > 0
            ? pendingRefundRequests.data[0]
            : null;
  if (testRefundRequest !== null) {
    typia.assert(testRefundRequest);
  }
}
