import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
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
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer filtering of refund request snapshots by status and seller response.
 *
 * Prerequisites: Customer must be registered, authenticated, and have refund
 * request snapshots with different statuses.
 *
 * Steps:
 * 1. Register a new customer account
 * 2. Query snapshots with snapshot_status = 'approved' and seller_response = 'approved'
 * 3. Query snapshots with snapshot_status = 'rejected' and seller_response = 'rejected'
 * 4. Test pagination with page=2 and limit=1
 * 5. Verify response structure and pagination metadata
 */
export async function test_api_refund_snapshot_customer_filter_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  // 2. Query snapshots filtered by approved status
  const approvedSnapshots =
    await api.functional.ecommerceMall.customer.refund_request_snapshots.index(
      customerConnection,
      {
        body: {
          snapshot_status: "approved",
          seller_response: "approved",
          page:
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() ?? 1,
          limit:
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >() ?? 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Verify pagination structure
  TestValidator.equals(
    "approved snapshots pagination exists",
    approvedSnapshots.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "approved snapshots pagination current >= 0",
    approvedSnapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "approved snapshots pagination limit >= 0",
    approvedSnapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "approved snapshots pagination records >= 0",
    approvedSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "approved snapshots pagination pages >= 0",
    approvedSnapshots.pagination.pages >= 0,
  );
  // Verify all returned snapshots have matching filter criteria
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "snapshot_status should be approved",
      snapshot.snapshot_status,
      "approved",
    );
    TestValidator.equals(
      "seller_response should be approved",
      snapshot.seller_response,
      "approved",
    );
  }
  // 3. Query snapshots filtered by rejected status
  const rejectedSnapshots =
    await api.functional.ecommerceMall.customer.refund_request_snapshots.index(
      customerConnection,
      {
        body: {
          snapshot_status: "rejected",
          seller_response: "rejected",
          page:
            typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>() ?? 1,
          limit:
            typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >() ?? 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedSnapshots);
  // Verify pagination structure
  TestValidator.equals(
    "rejected snapshots pagination exists",
    rejectedSnapshots.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "rejected snapshots pagination current >= 0",
    rejectedSnapshots.pagination.current >= 0,
  );
  // Verify all returned snapshots have matching filter criteria
  for (const snapshot of rejectedSnapshots.data) {
    TestValidator.equals(
      "snapshot_status should be rejected",
      snapshot.snapshot_status,
      "rejected",
    );
    TestValidator.equals(
      "seller_response should be rejected",
      snapshot.seller_response,
      "rejected",
    );
  }
  // 4. Test pagination with page=2 and limit=1
  const paginatedSnapshots =
    await api.functional.ecommerceMall.customer.refund_request_snapshots.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 1,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(paginatedSnapshots);
  // Verify pagination metadata reflects correct page boundaries
  TestValidator.equals(
    "paginated snapshots pagination current",
    paginatedSnapshots.pagination.current,
    2,
  );
  TestValidator.equals(
    "paginated snapshots pagination limit",
    paginatedSnapshots.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "paginated snapshots data length <= 1",
    paginatedSnapshots.data.length <= 1,
  );
  // If there are records, verify data array type
  if (paginatedSnapshots.data.length > 0) {
    for (const snapshot of paginatedSnapshots.data) {
      // Verify snapshot structure
      typia.assert(snapshot);
      TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
      TestValidator.predicate(
        "snapshot has snapshot_reason",
        snapshot.snapshot_reason !== undefined,
      );
      TestValidator.predicate(
        "snapshot has snapshot_status",
        snapshot.snapshot_status !== undefined,
      );
      TestValidator.predicate(
        "snapshot has seller_response",
        snapshot.seller_response !== undefined,
      );
      TestValidator.predicate(
        "snapshot has created_at",
        snapshot.created_at !== undefined,
      );
      TestValidator.predicate(
        "snapshot has customer",
        snapshot.customer !== undefined,
      );
      TestValidator.predicate(
        "snapshot has refundRequest",
        snapshot.refundRequest !== undefined,
      );
      TestValidator.predicate(
        "snapshot has seller",
        snapshot.seller !== undefined,
      );
    }
  }
  // 5. Test with pending status filter
  const pendingSnapshots =
    await api.functional.ecommerceMall.customer.refund_request_snapshots.index(
      customerConnection,
      {
        body: {
          snapshot_status: "pending",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingSnapshots);
  // Verify all returned snapshots have pending status
  for (const snapshot of pendingSnapshots.data) {
    TestValidator.equals(
      "snapshot_status should be pending",
      snapshot.snapshot_status,
      "pending",
    );
  }
}
