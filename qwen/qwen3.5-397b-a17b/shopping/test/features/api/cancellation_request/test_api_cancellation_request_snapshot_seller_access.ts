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
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_post_purchase_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_post_purchase_cancellation_request";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test seller access to cancellation request snapshots for their order items.
 *
 * Validates that sellers can retrieve cancellation request snapshots for order items they own, even though they didn't create the cancellation request. This tests the three-party visibility model where customers, sellers, and administrators can all access cancellation snapshots based on their relationship to the order item.
 *
 * The test establishes a complete workflow: seller creates product, customer orders it, customer requests cancellation, and seller retrieves the snapshot to review the cancellation reason. This ensures sellers have the information needed to make informed approval/rejection decisions.
 *
 * 1. Seller registers and authenticates via join.
 * 2. Seller creates a product listing.
 * 3. Customer registers and places an order containing the seller's product.
 * 4. Customer submits cancellation request for the order item.
 * 5. System creates initial snapshot with status='pending'.
 * 6. Seller retrieves the cancellation request snapshot.
 * 7. Validates snapshot contains all required fields and customer's reason.
 * 8. Verifies seller access control based on order item ownership.
 */
export async function test_api_cancellation_request_snapshot_seller_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Customer places an order containing the seller's product
  const order = await generate_random_shopping_mall_member_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 5. Find the order item for the seller's product
  const sellerOrderItem = order.orderItems.find(
    (item) => item.seller.id === sellerAuth.id,
  );
  TestValidator.predicate("order contains seller's product", () => {
    if (sellerOrderItem === undefined) return false;
    return true;
  });
  // 6. Customer submits cancellation request for the seller's order item
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      customerConnection,
      {
        body: {
          shopping_mall_order_item_id: sellerOrderItem!.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallPostPurchaseCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 7. Get the initial snapshot from the cancellation request
  TestValidator.predicate("cancellation request has snapshots", () => {
    if (cancellationRequest.snapshots === undefined) return false;
    return cancellationRequest.snapshots.length > 0;
  });
  const initialSnapshot = cancellationRequest.snapshots[0];
  typia.assert(initialSnapshot);
  // 8. Seller retrieves the cancellation request snapshot using the snapshot API
  const snapshot =
    await api.functional.shoppingMall.member.post_purchase.cancellation_requests.snapshots.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        snapshotId: initialSnapshot.id,
      },
    );
  typia.assert(snapshot);
  // 9. Validate snapshot contains all required fields
  TestValidator.equals("snapshot ID matches", snapshot.id, initialSnapshot.id);
  TestValidator.equals(
    "snapshot status is pending",
    snapshot.status,
    "pending",
  );
  TestValidator.equals(
    "snapshot reason matches",
    snapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "cancellation request ID matches",
    snapshot.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.predicate("reviewedAt is null for pending", () => {
    return snapshot.reviewedAt === null || snapshot.reviewedAt === undefined;
  });
  TestValidator.predicate("createdAt is valid date-time", () => {
    return (
      typeof snapshot.createdAt === "string" && snapshot.createdAt.length > 0
    );
  });
  // 10. Verify seller can access the snapshot (already succeeded above)
  // The fact that the API call succeeded proves seller has access
  // 11. Verify snapshot shows customer's cancellation reason
  TestValidator.notEquals("reason is not empty", snapshot.reason, "");
  TestValidator.predicate("reason contains customer explanation", () => {
    return snapshot.reason.length > 10;
  });
  // 12. Verify order item reference in cancellation request
  TestValidator.equals(
    "order item ID matches",
    snapshot.cancellationRequest.orderItem.id,
    sellerOrderItem!.id,
  );
  TestValidator.equals(
    "seller ID matches order item",
    snapshot.cancellationRequest.orderItem.seller.id,
    sellerAuth.id,
  );
}
