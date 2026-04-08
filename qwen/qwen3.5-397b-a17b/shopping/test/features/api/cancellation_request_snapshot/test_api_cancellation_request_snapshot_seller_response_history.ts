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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_post_purchase_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_cancellation_requests_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";

/**
 * Test that snapshots preserve complete history including seller response state for dispute resolution.
 *
 * Validates the complete snapshot audit trail for cancellation requests, ensuring that state changes from pending to approved are properly captured in immutable snapshot records. This test verifies that the system maintains a complete historical record for dispute resolution purposes.
 *
 * The test creates a cancellation request which automatically generates an initial snapshot with pending status. After the seller approves the request, a second snapshot is created capturing the approved state. Both snapshots are retrieved and validated to ensure immutability and correct state progression.
 *
 * 1. Customer joins the platform and creates an order with order items.
 * 2. Customer submits a cancellation request for an order item (creates first snapshot with status='pending').
 * 3. Seller joins the platform and approves the cancellation request.
 * 4. System automatically creates second snapshot with status='approved' and reviewedAt timestamp.
 * 5. Customer retrieves the second snapshot (post-response state) and validates status='approved', responseReason=null, reviewedAt is populated.
 * 6. Customer retrieves the first snapshot and verifies it remains unchanged (status='pending', reviewedAt=null).
 * 7. Validates both snapshots have different created_at timestamps showing chronological progression.
 * 8. Validates cancellation request reason is preserved identically across all snapshots.
 */
export async function test_api_cancellation_request_snapshot_seller_response_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and creates order
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customer);
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Get first order item for cancellation
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 2. Customer submits cancellation request (creates first snapshot with pending status)
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Verify initial cancellation request state
  TestValidator.equals(
    "initial status is pending",
    cancellationRequest.status,
    "pending",
  );
  // 3. Seller joins and approves cancellation request
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Seller approves the cancellation request (creates second snapshot)
  const approvedRequest =
    await api.functional.shoppingMall.seller.cancellation_requests.approve(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // Verify cancellation request is now approved
  TestValidator.equals(
    "status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "respondedAt is populated",
    approvedRequest.respondedAt !== null,
  );
  // 4. Get snapshots from the cancellation request
  const snapshots = cancellationRequest.snapshots;
  TestValidator.predicate("has at least 2 snapshots", snapshots.length >= 2);
  // Sort snapshots by created_at to identify first (pending) and second (approved)
  const sortedSnapshots = [...snapshots].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const firstSnapshot = sortedSnapshots[0];
  const secondSnapshot = sortedSnapshots[1];
  // 5. Retrieve second snapshot (approved state) via API
  const retrievedSecondSnapshot =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        snapshotId: secondSnapshot.id,
      },
    );
  typia.assert(retrievedSecondSnapshot);
  // 6. Validate second snapshot shows approved state
  TestValidator.equals(
    "second snapshot status is approved",
    retrievedSecondSnapshot.status,
    "approved",
  );
  TestValidator.predicate(
    "second snapshot reviewedAt is populated",
    retrievedSecondSnapshot.reviewedAt !== null,
  );
  // 7. Retrieve first snapshot (pending state) via API
  const retrievedFirstSnapshot =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        snapshotId: firstSnapshot.id,
      },
    );
  typia.assert(retrievedFirstSnapshot);
  // 8. Validate first snapshot remains unchanged (immutability)
  TestValidator.equals(
    "first snapshot status is pending",
    retrievedFirstSnapshot.status,
    "pending",
  );
  TestValidator.equals(
    "first snapshot reviewedAt is null",
    retrievedFirstSnapshot.reviewedAt,
    null,
  );
  // 9. Validate chronological progression
  TestValidator.predicate(
    "second snapshot created after first",
    new Date(retrievedSecondSnapshot.createdAt).getTime() >
      new Date(retrievedFirstSnapshot.createdAt).getTime(),
  );
  // 10. Validate reason is preserved identically across snapshots
  TestValidator.equals(
    "reason matches in first snapshot",
    retrievedFirstSnapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "reason matches in second snapshot",
    retrievedSecondSnapshot.reason,
    cancellationRequest.reason,
  );
  // 11. Validate reviewedAt is after first snapshot createdAt
  TestValidator.predicate(
    "reviewedAt is after first snapshot createdAt",
    new Date(retrievedSecondSnapshot.reviewedAt!).getTime() >
      new Date(retrievedFirstSnapshot.createdAt).getTime(),
  );
}
