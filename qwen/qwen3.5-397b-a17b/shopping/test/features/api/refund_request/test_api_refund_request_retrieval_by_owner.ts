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
import { generate_random_shopping_mall_member_post_purchase_refund_requests_create } from "../../../generate/generate_random_shopping_mall_member_post_purchase_refund_requests_create";
import { generate_random_shopping_mall_seller_orders_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_orders_shipments_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test refund request retrieval by owner.
 *
 * Validates that a member can successfully retrieve their own refund request details after creating a refund request for a delivered order item. The test establishes a complete e-commerce workflow including member and seller account creation, product listing, order placement, shipment creation, and refund request submission.
 *
 * The test verifies ownership validation by ensuring the authenticated member can access their own refund request. It validates that all refund request fields are correctly populated including member information, order item details, reason text, status, and timestamps.
 *
 * 1. Member account created and authenticated.
 * 2. Seller account created and authenticated.
 * 3. Seller creates product with variants.
 * 4. Member adds product variant to cart.
 * 5. Member places order creating order items.
 * 6. Seller creates shipment marking items as shipped.
 * 7. Member creates refund request for delivered order item.
 * 8. Member retrieves refund request details by ID.
 * 9. Validates response structure, ownership, and field values.
 */
export async function test_api_refund_request_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
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
  // 2. Create and authenticate seller account
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
  // 3. Seller creates product with variants
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get first variant for cart item
  const variant = product.variants[0];
  TestValidator.predicate("product has variants", product.variants.length > 0);
  // 4. Member adds product variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  typia.assert(cartItem);
  // 5. Member places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {},
  );
  typia.assert(order);
  // Get first order item for shipment
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 6. Seller creates shipment for order item
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.name(2),
          tracking_number: RandomGenerator.alphaNumeric(12),
        },
        params: {
          orderId: order.id,
        },
      },
    );
  typia.assert(shipment);
  // 7. Member creates refund request for delivered order item
  const refundRequestReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_shopping_mall_member_post_purchase_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: refundRequestReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 8. Member retrieves refund request details by ID
  const retrievedRefundRequest =
    await api.functional.shoppingMall.member.post_purchase.refund_requests.at(
      memberConnection,
      {
        id: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 9. Validate refund request retrieval
  // Verify ID matches
  TestValidator.equals(
    "refund request ID matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  // Verify member ownership
  TestValidator.equals(
    "member ID matches",
    retrievedRefundRequest.member.id,
    memberAuth.id,
  );
  // Verify order item reference
  TestValidator.equals(
    "order item ID matches",
    retrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
  // Verify reason text
  TestValidator.equals(
    "reason matches",
    retrievedRefundRequest.reason,
    refundRequestReason,
  );
  // Verify status is pending
  TestValidator.equals(
    "status is pending",
    retrievedRefundRequest.status,
    "pending",
  );
  // Verify reviewed_at is null for pending status
  TestValidator.equals(
    "reviewed_at is null",
    retrievedRefundRequest.reviewed_at,
    null,
  );
  // Verify timestamps exist and are valid
  TestValidator.predicate(
    "created_at exists",
    retrievedRefundRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRefundRequest.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedRefundRequest.deleted_at === null,
  );
  // Verify order item contains expected nested data
  TestValidator.predicate(
    "order item has product",
    retrievedRefundRequest.orderItem.product !== undefined,
  );
  TestValidator.predicate(
    "order item has variant",
    retrievedRefundRequest.orderItem.productVariant !== undefined,
  );
  TestValidator.predicate(
    "order item has seller",
    retrievedRefundRequest.orderItem.seller !== undefined,
  );
  TestValidator.predicate(
    "order item has shipment",
    retrievedRefundRequest.orderItem.shipment !== null,
  );
  // Verify shipment information is present
  TestValidator.equals(
    "shipment ID matches",
    retrievedRefundRequest.orderItem.shipment?.id,
    shipment.id,
  );
}
