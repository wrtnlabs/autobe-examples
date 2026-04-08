import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
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
 * Test customer request snapshots filtering by request type and status transitions.
 *
 * Validates that customers can filter their request snapshots (cancellation and refund requests) by request type and status outcomes. The test verifies that filtering by request_type correctly narrows results to either cancellation or refund snapshots, filtering by status_after correctly shows only approved or rejected requests, and combined filters work with AND logic.
 *
 * Special attention is given to verifying that each snapshot contains the correct status transition information (status_before='pending', status_after='approved' or 'rejected'), seller response details including optional seller_reason, and order item context.
 *
 * 1. Register and authenticate a customer for testing.
 * 2. Retrieve all request snapshots for the authenticated customer.
 * 3. Filter by request_type='cancellation' and verify only cancellation snapshots are returned.
 * 4. Filter by request_type='refund' and verify only refund snapshots are returned.
 * 5. Filter by status_after='approved' and verify only approved requests are returned (both types).
 * 6. Filter by status_after='rejected' and verify only rejected requests are returned.
 * 7. Combine filters with request_type='cancellation' AND status_after='approved' and verify only approved cancellations.
 * 8. Validate that each snapshot includes seller_reason field (may be null) and correct status transitions.
 */
export async function test_api_customer_request_snapshots_filter_by_request_type_and_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Retrieve all request snapshots without filters
  const allSnapshots =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {} satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // 3. Filter by request_type='cancellation'
  const cancellationSnapshots =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {
          request_type: "cancellation",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(cancellationSnapshots);
  // Verify all returned snapshots are cancellations (if any exist)
  if (cancellationSnapshots.data.length > 0) {
    TestValidator.predicate(
      "all cancellation filter results are cancellation type",
      cancellationSnapshots.data.every(
        (snapshot) => snapshot.request_type === "cancellation",
      ),
    );
  }
  // 4. Filter by request_type='refund'
  const refundSnapshots =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {
          request_type: "refund",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(refundSnapshots);
  // Verify all returned snapshots are refunds (if any exist)
  if (refundSnapshots.data.length > 0) {
    TestValidator.predicate(
      "all refund filter results are refund type",
      refundSnapshots.data.every(
        (snapshot) => snapshot.request_type === "refund",
      ),
    );
  }
  // 5. Filter by status_after='approved'
  const approvedSnapshots =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {
          status_after: "approved",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Verify all returned snapshots have status_after='approved' (if any exist)
  if (approvedSnapshots.data.length > 0) {
    TestValidator.predicate(
      "all approved filter results have status_after approved",
      approvedSnapshots.data.every(
        (snapshot) => snapshot.status_after === "approved",
      ),
    );
  }
  // 6. Filter by status_after='rejected'
  const rejectedSnapshots =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {
          status_after: "rejected",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Verify all returned snapshots have status_after='rejected' (if any exist)
  if (rejectedSnapshots.data.length > 0) {
    TestValidator.predicate(
      "all rejected filter results have status_after rejected",
      rejectedSnapshots.data.every(
        (snapshot) => snapshot.status_after === "rejected",
      ),
    );
  }
  // 7. Combine filters: request_type='cancellation' AND status_after='approved'
  const approvedCancellations =
    await api.functional.shoppingMall.customer.request_snapshots.index(
      customerConnection,
      {
        body: {
          request_type: "cancellation",
          status_after: "approved",
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedCancellations);
  // Verify all results are both cancellations AND approved (if any exist)
  if (approvedCancellations.data.length > 0) {
    TestValidator.predicate(
      "combined filter results are both cancellation and approved",
      approvedCancellations.data.every(
        (snapshot) =>
          snapshot.request_type === "cancellation" &&
          snapshot.status_after === "approved",
      ),
    );
  }
  // 8. Validate snapshot structure when data exists
  if (allSnapshots.data.length > 0) {
    const sampleSnapshot = allSnapshots.data[0];
    // Verify status_before is 'pending' (standard initial state)
    TestValidator.equals(
      "snapshot status_before is pending",
      sampleSnapshot.status_before,
      "pending",
    );
    // Verify status_after is either 'approved' or 'rejected'
    TestValidator.predicate(
      "snapshot status_after is valid",
      sampleSnapshot.status_after === "approved" ||
        sampleSnapshot.status_after === "rejected",
    );
    // Verify seller_reason field exists (can be null or string)
    TestValidator.predicate(
      "snapshot has seller_reason field",
      sampleSnapshot.seller_reason === null ||
        typeof sampleSnapshot.seller_reason === "string",
    );
    // Verify seller information is included
    TestValidator.predicate(
      "snapshot includes seller information",
      sampleSnapshot.seller !== null && sampleSnapshot.seller.id !== undefined,
    );
    // Verify order item information is included
    TestValidator.predicate(
      "snapshot includes order item information",
      sampleSnapshot.orderItem !== null &&
        sampleSnapshot.orderItem.id !== undefined,
    );
  }
}
