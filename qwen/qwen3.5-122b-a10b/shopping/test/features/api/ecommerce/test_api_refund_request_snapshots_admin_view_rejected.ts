import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_orders_items_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

/**
 * Test administrator view of refund request snapshots for rejected requests.
 *
 * Validates that administrators can access the complete audit trail of refund request snapshots when a seller rejects a customer's refund request. This test ensures the snapshot system properly records status transitions and seller responses for dispute resolution oversight.
 *
 * The test creates customer, seller, and administrator accounts, then simulates a refund request workflow where the customer submits a refund request and the seller rejects it. Finally, it verifies that the administrator can retrieve all snapshots in chronological order with correct status information.
 *
 * 1. Create and authenticate customer, seller, and administrator accounts.
 * 2. Generate UUIDs for order and order item to simulate existing data.
 * 3. Customer submits refund request with reason (creates pending snapshot).
 * 4. Seller rejects refund request with rejection reason (creates rejected snapshot).
 * 5. Administrator retrieves snapshots via admin endpoint.
 * 6. Verify pagination metadata includes correct current page and limit values.
 * 7. Verify first snapshot shows 'pending' status with null seller_response and response_at.
 * 8. Verify second snapshot shows 'rejected' status with populated seller_response and response_at.
 * 9. Verify snapshots are ordered chronologically by created_at timestamp.
 * 10. Verify all required snapshot fields (id, reason, status, created_at) are present.
 */
export async function test_api_refund_request_snapshots_admin_view_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(admin);
  // 4. Generate random UUIDs for order and order item
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Submit refund request (creates first snapshot with pending status)
  const refundReason: string = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_ecommerce_customer_orders_items_refund_requests_create(
      customerConnection,
      {
        params: {
          orderId,
          itemId,
        },
        body: {
          reason: refundReason,
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // 6. Seller rejects the refund request (creates second snapshot with rejected status)
  const rejectionReason: string = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRefundRequest =
    await api.functional.ecommerce.seller.orders.items.refund_requests.update(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId: refundRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  TestValidator.equals(
    "refund request status is rejected",
    updatedRefundRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason is set",
    updatedRefundRequest.rejection_reason,
    rejectionReason,
  );
  // 7. Admin retrieves snapshots for the refund request
  const snapshots =
    await api.functional.ecommerce.admin.orders.items.refund_requests.snapshots.index(
      adminConnection,
      {
        orderId,
        itemId,
        requestId: refundRequest.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 8. Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is set",
    snapshots.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records",
    snapshots.pagination.records > 0,
  );
  // 9-10. Verify snapshots are in chronological order with correct statuses
  TestValidator.predicate(
    "has at least 2 snapshots",
    snapshots.data.length >= 2,
  );
  // First snapshot should be pending
  const firstSnapshot = snapshots.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "first snapshot status is pending",
    firstSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "first snapshot reason matches",
    firstSnapshot.reason,
    refundReason,
  );
  TestValidator.equals(
    "first snapshot seller_response is null",
    firstSnapshot.seller_response,
    null,
  );
  TestValidator.equals(
    "first snapshot response_at is null",
    firstSnapshot.response_at,
    null,
  );
  // Second snapshot should be rejected
  const secondSnapshot = snapshots.data[1];
  typia.assert(secondSnapshot);
  TestValidator.equals(
    "second snapshot status is rejected",
    secondSnapshot.status,
    "rejected",
  );
  TestValidator.equals(
    "second snapshot reason matches",
    secondSnapshot.reason,
    refundReason,
  );
  TestValidator.predicate(
    "second snapshot seller_response is not null",
    secondSnapshot.seller_response !== null,
  );
  TestValidator.predicate(
    "second snapshot response_at is not null",
    secondSnapshot.response_at !== null,
  );
  // 11. Verify chronological order (first created_at <= second created_at)
  TestValidator.predicate(
    "snapshots are in chronological order",
    new Date(firstSnapshot.created_at).getTime() <=
      new Date(secondSnapshot.created_at).getTime(),
  );
  // 12. Verify snapshot fields are present
  TestValidator.predicate(
    "first snapshot has id",
    firstSnapshot.id !== undefined,
  );
  TestValidator.predicate(
    "first snapshot has created_at",
    firstSnapshot.created_at !== undefined,
  );
  TestValidator.predicate(
    "second snapshot has id",
    secondSnapshot.id !== undefined,
  );
  TestValidator.predicate(
    "second snapshot has created_at",
    secondSnapshot.created_at !== undefined,
  );
}
