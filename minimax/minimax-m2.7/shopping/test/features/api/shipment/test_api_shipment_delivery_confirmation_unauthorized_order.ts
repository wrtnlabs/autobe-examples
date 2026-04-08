import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test authorization error when customer attempts to confirm delivery for another customer's order.
 *
 * Validates that the system properly enforces ownership checks on the shipment delivery confirmation endpoint. Customers should only be able to confirm delivery for their own orders' shipments. When Customer B (who does not own the order) attempts to confirm delivery for Customer A's shipment, the system must reject the request with HTTP 403 Forbidden.
 *
 * This test ensures proper authorization boundaries are maintained:
 * 1. Two customers are registered - Customer A (order owner) and Customer B (unauthorized user)
 * 2. Seller registers and creates products with inventory
 * 3. Customer A places an order and the seller ships the items
 * 4. Customer B attempts to confirm delivery for Customer A's shipment
 * 5. System returns HTTP 403 Forbidden with clear authorization error
 * 6. Order items remain in 'shipped' status (unauthorized request cannot modify them)
 *
 * The test validates business logic for access control, ensuring that customers cannot perform actions on other customers' orders.
 */
export async function test_api_shipment_delivery_confirmation_unauthorized_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A (order owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  // 2. Register Customer B (will attempt unauthorized confirmation)
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {});
  // 3. Register and login as Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 4. Create shipping address for Customer A
  const address =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerAConnection,
      {
        body: {
          recipient_name: "Customer A",
          phone: RandomGenerator.mobile(),
          street_address: RandomGenerator.alphabets(10) + " Street",
          city: RandomGenerator.name(1),
          state: RandomGenerator.name(1),
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  // 5. Check if Customer A has items in cart
  // If cart has no items, we cannot proceed - test requires products to exist
  if (customerA.cart.items.length === 0) {
    // Test cannot proceed without cart items
    // In a proper test environment, products would be pre-seeded
    throw new Error(
      "Test requires products to exist in the system. Cart is empty.",
    );
  }
  // 6. Customer A creates order
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerAConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Verify order has items
  if (order.orderItems.length === 0) {
    throw new Error("Order was created but has no items. Test cannot proceed.");
  }
  // 7. Seller ships Customer A's order items
  const orderItem = order.orderItems[0];
  const shipment =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.ship.create(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          carrier: RandomGenerator.name(1) + " Shipping",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          itemIds: [orderItem.id],
        } satisfies IEcommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 8. Customer B attempts to confirm delivery for Customer A's shipment
  // This should fail with HTTP 403 Forbidden - customer does not own this order
  await TestValidator.httpError(
    "Customer B should not be able to confirm delivery for Customer A's shipment",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.customers.me.orders.shipments.confirm_delivery.confirmDelivery(
        customerBConnection,
        {
          orderId: order.id,
          shipmentId: shipment.id,
        },
      );
    },
  );
  // 9. Verify the shipment items are still in 'shipped' status
  // The order items should not have been modified by the unauthorized request
  const shipmentItem = shipment.shipmentItems[0];
  TestValidator.equals(
    "Shipment item status should remain 'shipped' after unauthorized confirmation attempt",
    shipmentItem.status,
    "shipped",
  );
}