import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that a customer can retrieve their refund request after seller approval with reviewed_at timestamp populated.
 *
 * Validates the complete refund request lifecycle from customer submission through seller approval, ensuring that approved refund requests remain accessible to customers with accurate audit timestamps. The test verifies that the reviewed_at field is populated upon seller approval and that all status transitions are correctly reflected in the retrieved data.
 *
 * The test establishes a full e-commerce workflow: seller creates product with variants, customer places order, seller ships the order, customer receives delivery, customer requests refund, and seller approves the refund. This end-to-end scenario validates the integration between order management, shipment tracking, and refund request workflows.
 *
 * 1. Customer member account created and authenticated.
 * 2. Seller account created, authenticated, and creates product with variant.
 * 3. Customer adds variant to cart and places order.
 * 4. Seller creates shipment for order item (transitions to 'shipped').
 * 5. Customer confirms delivery (transitions to 'delivered').
 * 6. Customer creates refund request for delivered order item.
 * 7. Seller approves the refund request (transitions to 'approved', populates reviewed_at).
 * 8. Customer retrieves refund request and validates approved status with reviewed_at timestamp.
 */
export async function test_api_refund_request_approved_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Customer adds variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // 6. Customer places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(order);
  // Get the order item for this order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order item exists", orderItem !== undefined);
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 7. Seller creates shipment for the order item
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.name(),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  typia.assert(shipment);
  // Note: Delivery confirmation API not available in provided SDK
  // In test environment, shipment creation may auto-complete delivery
  // or the system auto-delivers after 14 days from shipping
  // 8. Customer creates refund request for the delivered order item
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "refund request status is pending",
    refundRequest.status,
    "pending",
  );
  // 9. Seller approves the refund request
  const approvedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(approvedRefundRequest);
  TestValidator.equals(
    "refund request status is approved",
    approvedRefundRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    approvedRefundRequest.reviewed_at !== null,
  );
  // 10. Customer retrieves the approved refund request
  const retrievedRefundRequest =
    await api.functional.shoppingMall.member.refund_requests.at(
      memberConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 11. Validate the retrieved refund request
  TestValidator.equals(
    "refund request id matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "member id matches",
    retrievedRefundRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "order item id matches",
    retrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRefundRequest.reason,
    refundReason,
  );
  TestValidator.equals(
    "status is approved",
    retrievedRefundRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is populated",
    retrievedRefundRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedRefundRequest.deleted_at === null,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(retrievedRefundRequest.updated_at) >
      new Date(retrievedRefundRequest.created_at),
  );
}
