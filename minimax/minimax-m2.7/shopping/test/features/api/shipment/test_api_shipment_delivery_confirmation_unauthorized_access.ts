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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_delivery_confirmation_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller joins and logs in to create products
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // Create product with inventory for checkout
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {},
    },
  );
  typia.assert(product);
  // Add inventory to product variant (first variant)
  const variant = product.variants[0];
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        operation: "restock",
        quantity: 10,
        reason: "Initial stock for testing",
      },
    },
  );
  // Step 2: Customer A (order owner) joins and logs in
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // Customer A adds item to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerAConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: 1,
      },
    },
  );
  // Customer A checks out (place order)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerAConnection,
      {
        body: {
          payment_token: "test_payment_token",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Step 3: Seller ships the order
  const orderItemId = order.orderItems[0].id;
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: [orderItemId],
        carrier: "TestCarrier",
        trackingNumber: "TRACK123456",
      },
    },
  );
  typia.assert(shipment);
  // Step 4: Customer A confirms delivery for their own shipment (should succeed)
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerAConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // Validate Customer A's confirmation was successful (shipment items should be delivered)
  TestValidator.equals(
    "shipment items delivered",
    confirmedShipment.shipment_items.every(
      (item) => item.orderItem.status === "delivered",
    ),
    true,
  );
  // Step 5: Create a NEW order for Customer B to have their own shipment
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // Customer B adds item to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerBConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: 1,
      },
    },
  );
  // Customer B checks out (place their own order)
  const orderB =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerBConnection,
      {
        body: {
          payment_token: "test_payment_token_b",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(orderB);
  // Seller ships Customer B's order
  const orderBItemId = orderB.orderItems[0].id;
  const shipmentB =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          orderId: orderB.id,
          orderItemIds: [orderBItemId],
          carrier: "TestCarrier",
          trackingNumber: "TRACK789012",
        },
      },
    );
  typia.assert(shipmentB);
  // Customer B confirms their own delivery (should succeed)
  await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
    customerBConnection,
    {
      orderId: orderB.id,
      shipmentId: shipmentB.id,
    },
  );
  // Step 6: Customer B attempts to confirm delivery for Customer A's shipment (should fail with 403)
  await TestValidator.httpError(
    "Customer B cannot confirm delivery for Customer A's shipment",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
        customerBConnection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
        },
      );
    },
  );
  // Step 7: Verify order data remains unchanged after unauthorized attempt
  // Note: The order has already been delivered by Customer A, so we just verify the endpoint enforces authorization
}
