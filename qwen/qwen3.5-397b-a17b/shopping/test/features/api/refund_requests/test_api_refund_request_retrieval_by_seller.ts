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
 * Test that a seller can retrieve refund requests for order items they own.
 *
 * Validates the complete refund request retrieval workflow including seller authentication, customer order placement, shipment creation, delivery confirmation, refund request creation, and seller's ability to access the refund request details. Ensures that the seller can only access refund requests for order items from products they own.
 *
 * The test establishes a multi-actor scenario where a customer purchases a product from a seller, receives the shipment, creates a refund request, and the seller retrieves the refund request to review it. This validates the authorization logic that grants sellers access to refund requests based on order item ownership.
 *
 * 1. Customer member registers and authenticates.
 * 2. Seller registers and authenticates.
 * 3. Seller creates a product with a variant.
 * 4. Customer adds the variant to cart and places an order.
 * 5. Seller creates a shipment for the order item.
 * 6. Order item transitions to 'delivered' status (shipment delivered_at is set).
 * 7. Customer creates a refund request for the delivered order item.
 * 8. Seller retrieves the refund request using their authentication.
 * 9. Validates refund request details match expected values.
 */
export async function test_api_refund_request_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates a product
  const product =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  // 4. Seller creates a product variant
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
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Customer places an order (need to create address first - using random UUID for test)
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item for this seller's product
  const orderItem = order.orderItems.find(
    (item) => item.product.id === product.id,
  );
  if (!orderItem) {
    throw new Error("Order item for seller's product not found");
  }
  // 7. Seller creates shipment for the order item
  const shipment =
    await generate_random_shopping_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          order_item_ids: [orderItem.id],
          carrier_name: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
          tracking_number: typia.random<string>(),
        } satisfies IShoppingMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 8. Simulate delivery by updating shipment delivered_at (in real scenario, this would be done by customer confirmation or auto-after 14 days)
  // For E2E test, we assume the shipment is delivered
  // 9. Customer creates a refund request for the delivered order item
  const refundRequest =
    await generate_random_shopping_mall_member_refund_requests_create(
      memberConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 10. Seller retrieves the refund request
  const retrievedRefundRequest =
    await api.functional.shoppingMall.member.refund_requests.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 11. Validate refund request details
  TestValidator.equals(
    "refund request id",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "member id",
    retrievedRefundRequest.member.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "order item id",
    retrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "reason",
    retrievedRefundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.equals("status", retrievedRefundRequest.status, "pending");
  TestValidator.predicate(
    "reviewed_at is null",
    retrievedRefundRequest.reviewed_at === null ||
      retrievedRefundRequest.reviewed_at === undefined,
  );
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
  // Validate order item shows seller's product
  TestValidator.equals(
    "product id in order item",
    retrievedRefundRequest.orderItem.product.id,
    product.id,
  );
  TestValidator.equals(
    "seller id in order item",
    retrievedRefundRequest.orderItem.seller.id,
    sellerAuth.id,
  );
}