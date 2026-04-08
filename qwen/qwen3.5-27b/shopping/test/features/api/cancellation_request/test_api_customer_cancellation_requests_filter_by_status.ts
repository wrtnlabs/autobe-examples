import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer cancellation requests filtering by status.
 *
 * Validates that customers can filter their cancellation requests by status (pending, approved, rejected). The test verifies that the status filter correctly returns only requests matching the specified status, and that approved/rejected requests include the seller's response_reason while pending requests have null response_reason.
 *
 * Special attention is given to verifying the response_reason field behavior across different statuses and ensuring that filtering without a status parameter returns all requests regardless of status.
 *
 * 1. Customer registers and authenticates to the platform.
 * 2. Retrieve all cancellation requests without filter to establish baseline.
 * 3. Filter by status='pending' and verify only pending requests are returned.
 * 4. Filter by status='approved' and verify only approved requests are returned with response_reason populated.
 * 5. Filter by status='rejected' and verify only rejected requests are returned with response_reason populated.
 * 6. Verify that pending requests have null response_reason while approved/rejected have non-null response_reason.
 */
export async function test_api_customer_cancellation_requests_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve all cancellation requests without filter
  const allRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(allRequests);
  // 3. Filter by status='pending'
  const pendingRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(pendingRequests);
  // Verify all returned requests are pending
  TestValidator.predicate(
    "all pending requests have status 'pending'",
    pendingRequests.data.every((req) => req.status === "pending"),
  );
  // Verify pending requests have null response_reason
  TestValidator.predicate(
    "pending requests have null response_reason",
    pendingRequests.data.every((req) => req.response_reason === null),
  );
  // 4. Filter by status='approved'
  const approvedRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(approvedRequests);
  // Verify all returned requests are approved
  TestValidator.predicate(
    "all approved requests have status 'approved'",
    approvedRequests.data.every((req) => req.status === "approved"),
  );
  // Verify approved requests have non-null response_reason
  TestValidator.predicate(
    "approved requests have non-null response_reason",
    approvedRequests.data.every((req) => req.response_reason !== null),
  );
  // 5. Filter by status='rejected'
  const rejectedRequests =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(rejectedRequests);
  // Verify all returned requests are rejected
  TestValidator.predicate(
    "all rejected requests have status 'rejected'",
    rejectedRequests.data.every((req) => req.status === "rejected"),
  );
  // Verify rejected requests have non-null response_reason
  TestValidator.predicate(
    "rejected requests have non-null response_reason",
    rejectedRequests.data.every((req) => req.response_reason !== null),
  );
  // 6. Verify filter counts match total
  const totalFilteredCount =
    pendingRequests.data.length +
    approvedRequests.data.length +
    rejectedRequests.data.length;
  TestValidator.equals(
    "filtered counts sum to total requests",
    totalFilteredCount,
    allRequests.data.length,
  );
}
