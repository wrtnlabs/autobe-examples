import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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
 * Test administrator retrieval of cancellation request snapshot for platform oversight.
 *
 * Validates the complete cancellation request snapshot retrieval workflow including multi-actor setup (admin, member, seller), product creation, order placement, cancellation request submission, and admin snapshot access. Ensures that administrators can access cancellation request snapshots across the platform for oversight purposes.
 *
 * Special attention is given to verifying that the snapshot accurately preserves the initial request state with correct status, reason, and null response fields before any seller action.
 *
 * 1. Administrator account created for platform oversight access.
 * 2. Member account created to place order and submit cancellation request.
 * 3. Seller account created to own product and fulfill order.
 * 4. Seller creates product with variants for member to purchase.
 * 5. Member places order containing seller's product.
 * 6. Member creates cancellation request for order item, triggering initial snapshot creation.
 * 7. Admin retrieves the cancellation request snapshot using the snapshot ID.
 * 8. Validates snapshot contains all required fields with correct values for pending status.
 */
export async function test_api_cancellation_request_snapshot_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for platform oversight
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Create member account for placing order
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Create seller account for product ownership
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 4. Seller creates product with variants
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 5. Member places order containing the product
  const order =
    await generate_random_shopping_mall_member_orders_create(
      memberConnection,
      {},
    );
  typia.assert(order);
  // 6. Member creates cancellation request for order item
  const orderItem = order.orderItems[0];
  const cancellationRequest =
    await generate_random_shopping_mall_member_post_purchase_cancellation_requests_create(
      memberConnection,
      {
        body: {
          shopping_mall_order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Get the initial snapshot ID from the cancellation request
  const snapshotId = cancellationRequest.snapshots[0].id;
  const cancellationRequestId = cancellationRequest.id;
  // 7. Admin retrieves the cancellation request snapshot
  const snapshot =
    await api.functional.shoppingMall.admin.post_purchase.cancellation_requests.snapshots.at(
      adminConnection,
      {
        cancellationRequestId: cancellationRequestId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 8. Validate snapshot structure and content
  TestValidator.equals("snapshot ID matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "cancellation request ID matches",
    snapshot.cancellationRequest.id,
    cancellationRequestId,
  );
  TestValidator.equals("status is pending", snapshot.status, "pending");
  TestValidator.equals(
    "reason matches input",
    snapshot.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "responseReason is null for pending",
    snapshot.responseReason,
    null,
  );
  TestValidator.equals(
    "reviewedAt is null for pending",
    snapshot.reviewedAt,
    null,
  );
  TestValidator.predicate(
    "createdAt is valid timestamp",
    () => new Date(snapshot.createdAt).getTime() > 0,
  );
  TestValidator.equals(
    "orderItem ID matches",
    snapshot.cancellationRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "customer ID matches member",
    snapshot.cancellationRequest.customer.id,
    memberAuth.id,
  );
}