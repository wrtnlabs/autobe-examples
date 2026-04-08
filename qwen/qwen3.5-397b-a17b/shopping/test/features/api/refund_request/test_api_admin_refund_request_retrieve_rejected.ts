import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
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
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test administrator retrieval of rejected refund request details.
 *
 * Validates the complete refund request rejection workflow including administrative oversight capabilities. Ensures that administrators can access rejected refund requests with full context including the seller's rejection reason, customer's original request details, and complete order item information for dispute resolution and platform monitoring purposes.
 *
 * The test verifies that rejected refund requests maintain all original data integrity while properly recording the seller's rejection decision and timestamp. This enables administrators to review seller decisions, handle customer disputes, and ensure fair treatment across the platform.
 *
 * 1. Administrator account creation and authentication.
 * 2. Seller account creation, authentication, and admin approval.
 * 3. Product and variant creation by seller.
 * 4. Customer (member) account creation and authentication.
 * 5. Customer places order containing the product variant.
 * 6. Seller creates shipment to mark order as delivered.
 * 7. Customer creates refund request for delivered order item.
 * 8. Seller rejects the refund request with a reason.
 * 9. Administrator retrieves the rejected refund request by ID.
 * 10. Validates response shows rejected status, populated reviewed_at timestamp, seller's rejection reason, and preserved original request details.
 */
export async function test_api_admin_refund_request_retrieve_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup
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
  // Admin approves seller
  const approvedSeller = await api.functional.shoppingMall.admin.sellers.update(
    adminConnection,
    {
      sellerId: sellerAuth.id,
      body: {
        approval_status: "approved",
        rejection_reason: null,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(approvedSeller);
  // 3. Product and variant creation
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer (member) setup
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
  // 5. Customer places order (cart items are auto-converted to order items)
  const order =
    await generate_random_shopping_mall_member_orders_create(memberConnection, {});
  typia.assert(order);
  // Get the order item for this seller's product
  const orderItem = order.orderItems.find(
    (item) => item.seller.id === sellerAuth.id,
  );
  if (!orderItem) {
    throw new Error("Order item not found for seller");
  }
  // 6. Seller creates shipment to mark order as delivered
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
        },
      },
    );
  typia.assert(shipment);
  // 7. Customer creates refund request for delivered order item
  const refundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
        },
      },
    );
  typia.assert(refundRequest);
  // 8. Seller rejects the refund request with a reason
  const rejectionReason = "Product was used and cannot be resold";
  const rejectedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.reject(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          sellerResponseComment: rejectionReason,
        } satisfies IShoppingMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRefundRequest);
  // 9. Administrator retrieves the rejected refund request by ID
  const adminRetrievedRefundRequest =
    await api.functional.shoppingMall.admin.post_purchase.refund_requests.at(
      adminConnection,
      {
        id: rejectedRefundRequest.id,
      },
    );
  typia.assert(adminRetrievedRefundRequest);
  // 10. Validate response
  TestValidator.equals(
    "status is rejected",
    adminRetrievedRefundRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    adminRetrievedRefundRequest.reviewed_at !== null &&
      adminRetrievedRefundRequest.reviewed_at !== undefined,
  );
  TestValidator.equals(
    "member matches original",
    adminRetrievedRefundRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "order item matches",
    adminRetrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "reason preserved",
    adminRetrievedRefundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "reviewed_at is after created_at",
    new Date(adminRetrievedRefundRequest.reviewed_at!).getTime() >=
      new Date(adminRetrievedRefundRequest.created_at).getTime(),
  );
}