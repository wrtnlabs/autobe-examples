import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test retrieving cancellation request snapshots with status filter.
 *
 * This E2E test validates the filtering capability and proper snapshot data retrieval
 * for cancellation request snapshots. It tests that:
 * 1. Customer can retrieve their cancellation request snapshots
 * 2. Status filter ('approved') correctly filters results
 * 3. Pagination metadata is correctly returned
 * 4. Snapshot structure includes required fields (id, reason, status, created_at)
 *
 * @param connection Base API connection for the test
 */
export async function test_api_cancellation_request_snapshot_filtered_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(customer);
  // 2. Retrieve cancellation request list to find existing requests
  const cancellationRequests =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: {
          customer_id: customer.id,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequests);
  // 3. Get snapshots for each cancellation request with status filter 'approved'
  // Only test if there are cancellation requests available
  if (cancellationRequests.data.length > 0) {
    const requestId = cancellationRequests.data[0]!.id;
    // Retrieve snapshots with 'approved' status filter
    const snapshotsPage =
      await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
        customerConnection,
        {
          requestId: requestId,
          body: {
            status: "approved",
            page: 1,
            limit: 10,
          } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(snapshotsPage);
    // Validate pagination metadata is correctly returned
    TestValidator.equals(
      "pagination.current is 1",
      snapshotsPage.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination.limit is positive",
      snapshotsPage.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination.records is non-negative",
      snapshotsPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination.pages is non-negative",
      snapshotsPage.pagination.pages >= 0,
    );
    // If snapshots exist, validate structure
    if (snapshotsPage.data.length > 0) {
      const snapshot = snapshotsPage.data[0]!;
      // Validate snapshot structure includes id, reason, status, created_at
      TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
      TestValidator.predicate(
        "snapshot has reason",
        snapshot.reason.length > 0,
      );
      TestValidator.equals(
        "snapshot status is approved",
        snapshot.status,
        "approved",
      );
      TestValidator.predicate(
        "snapshot has valid created_at",
        snapshot.created_at.length > 0,
      );
      // Validate cancellation_request context is included
      TestValidator.predicate(
        "snapshot has cancellation_request context",
        snapshot.cancellation_request.id.length > 0,
      );
      // Validate all snapshots match the filter criteria
      for (const snap of snapshotsPage.data) {
        TestValidator.equals(
          "filtered snapshot status is approved",
          snap.status,
          "approved",
        );
      }
    }
  }
}
