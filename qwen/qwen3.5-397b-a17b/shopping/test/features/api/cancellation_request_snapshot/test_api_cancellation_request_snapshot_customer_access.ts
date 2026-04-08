import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallPostPurchaseCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequest";
import type { IShoppingMallPostPurchaseCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseCancellationRequestSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";

/**
 * Test customer access to their own cancellation request snapshot.
 *
 * Validates that a customer can retrieve snapshots of their own cancellation request through the three-party access control system. The test verifies the complete workflow from customer registration through order creation, cancellation request submission, and snapshot retrieval.
 *
 * The snapshot system creates immutable audit records when cancellation requests are submitted. This test ensures customers can access their own request history while the access control prevents unauthorized access to other users' cancellation data.
 *
 * 1. Customer registers and authenticates as member.
 * 2. Customer creates an order with products (order items start in 'paid' status).
 * 3. Customer submits cancellation request for an order item.
 * 4. System automatically creates initial snapshot with status='pending'.
 * 5. Customer retrieves the snapshot using the snapshot endpoint.
 * 6. Validates snapshot contains all required fields with correct values.
 * 7. Verifies snapshot.cancellationRequest references the correct request.
 * 8. Confirms responseReason and reviewedAt are null for pending status.
 * 9. Validates reason text matches the customer's submitted cancellation reason.
 */
export async function test_api_cancellation_request_snapshot_customer_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customer);
  // 2. Customer creates an order (order items will be in 'paid' status)
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has at least one order item
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Get the first order item for cancellation
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 3. Customer submits cancellation request for the order item
  const cancellationReason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: cancellationReason,
        } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 4. Verify cancellation request was created with pending status
  TestValidator.equals(
    "cancellation status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "cancellation reason matches",
    cancellationRequest.reason,
    cancellationReason,
  );
  // 5. Get the initial snapshot (created automatically with the request)
  // The snapshot ID should be available from the cancellation request snapshots array
  TestValidator.predicate(
    "cancellation request has snapshots",
    cancellationRequest.snapshots.length > 0,
  );
  const snapshot = cancellationRequest.snapshots[0];
  TestValidator.equals(
    "snapshot status is pending",
    snapshot.status,
    "pending",
  );
  // 6. Customer retrieves the snapshot using the snapshot endpoint
  const retrievedSnapshot =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 7. Validate snapshot contains all required fields
  TestValidator.equals(
    "snapshot ID matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot status is pending",
    retrievedSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "snapshot reason matches cancellation reason",
    retrievedSnapshot.reason,
    cancellationReason,
  );
  // 8. Verify responseReason and reviewedAt are null for pending requests
  TestValidator.equals(
    "responseReason is null for pending",
    retrievedSnapshot.responseReason ?? null,
    null,
  );
  TestValidator.equals(
    "reviewedAt is null for pending",
    retrievedSnapshot.reviewedAt ?? null,
    null,
  );
  // 9. Validate cancellationRequest reference in snapshot
  TestValidator.equals(
    "snapshot cancellationRequest ID matches",
    retrievedSnapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "snapshot cancellationRequest orderItem ID matches",
    retrievedSnapshot.cancellationRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "snapshot cancellationRequest customer ID matches",
    retrievedSnapshot.cancellationRequest.customer.id,
    customer.id,
  );
  // 10. Verify snapshot createdAt timestamp is valid
  TestValidator.predicate(
    "snapshot createdAt is valid date",
    new Date(retrievedSnapshot.createdAt).getTime() > 0,
  );
  // 11. Verify snapshot was created around the same time as cancellation request
  const snapshotTime = new Date(retrievedSnapshot.createdAt).getTime();
  const cancellationTime = new Date(cancellationRequest.created_at).getTime();
  const timeDiff = Math.abs(snapshotTime - cancellationTime);
  TestValidator.predicate(
    "snapshot created close to cancellation request",
    timeDiff < 5000,
  );
}
