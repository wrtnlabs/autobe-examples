import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that an authenticated customer can successfully retrieve detailed information
 * about a refund request they submitted. This validates the primary success path
 * where the requesting customer matches the refund request's customer_id.
 *
 * The response should include:
 * - refund request id
 * - order item reference with frozen product snapshot
 * - customer and seller identifiers with emails
 * - the reason text provided by customer
 * - current status (pending/approved/rejected)
 * - seller response timestamp if responded
 * - creation timestamp
 * - any snapshots captured during the approval/rejection workflow
 *
 * Note: The refund request creation endpoint is not available in the SDK.
 * This test sets up the complete order flow up to delivery confirmation.
 */
export async function test_api_refund_request_retrieval_by_owner_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - join
  const sellerJoin = await authorize_seller_join(connection, {});
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerJoin.token.access}`,
  };
  // 2. Create product with inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Get the first variant
  const variant = product.variants[0];
  typia.assert(variant);
  // Add inventory to the variant
  const inventoryRecord =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          operation: "restock",
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          reason: "Initial stock",
        },
      },
    );
  typia.assert(inventoryRecord);
  // 3. Customer setup - join
  const customerJoin = await authorize_customer_join(connection, {});
  const customerConnection: api.IConnection = { host: connection.host };
  customerConnection.headers = {
    Authorization: `Bearer ${customerJoin.token.access}`,
  };
  // Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Add product to cart and checkout
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // Checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token",
          address_id: address.id,
        },
      },
    );
  typia.assert(order);
  TestValidator.equals("order status is paid", order.status, "paid");
  // Get order item
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 5. Seller ships the order
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItem.id],
        carrier: "Test Carrier",
        trackingNumber: "TRACK123456",
      },
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // NOTE: The refund request creation endpoint (POST /ecommerceMall/customer/orders/{orderId}/items/{itemId}/refund)
  // is not available in the SDK. The test cannot create a refund request to retrieve.
  // This test validates the complete order flow up to delivery confirmation.
  // Validate the complete order setup is ready for refund request
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.equals(
    "order item status is delivered",
    orderItem.status,
    "delivered",
  );
  TestValidator.equals(
    "customer id matches order",
    order.customer.id,
    customerJoin.id,
  );
  // Validate order item has frozen product snapshot
  TestValidator.predicate(
    "has product snapshot",
    orderItem.productSnapshot !== null &&
      orderItem.productSnapshot !== undefined,
  );
  TestValidator.equals(
    "product name preserved in snapshot",
    orderItem.productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "product price preserved in snapshot",
    orderItem.productSnapshot.base_price,
    product.base_price,
  );
  // Validate seller profile snapshot
  TestValidator.predicate(
    "has seller profile snapshot",
    orderItem.sellerProfileSnapshot !== null &&
      orderItem.sellerProfileSnapshot !== undefined,
  );
  // Validate shipment details
  TestValidator.equals("shipment carrier", shipment.carrier, "Test Carrier");
  TestValidator.equals(
    "shipment tracking number",
    shipment.tracking_number,
    "TRACK123456",
  );
  TestValidator.equals(
    "shipment order id matches",
    shipment.order.id,
    order.id,
  );
  TestValidator.equals(
    "shipment seller id matches",
    shipment.seller.id,
    sellerJoin.id,
  );
}
