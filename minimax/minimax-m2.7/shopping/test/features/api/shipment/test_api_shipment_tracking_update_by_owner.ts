import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test successful update of shipment tracking information after shipment creation.
 *
 * Steps:
 * 1. Register and login as seller
 * 2. Register and login as customer
 * 3. Create customer shipping address
 * 4. Customer checkout creates order with paid items
 * 5. Seller creates initial shipment with carrier and tracking number
 * 6. Seller updates the shipment with corrected carrier name and tracking number
 *
 * Verify:
 * - Response returns updated carrier and tracking number
 * - updatedAt timestamp is refreshed
 * - Shipment belongs to correct order and seller
 */
export async function test_api_shipment_tracking_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Register and login as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Create shipping address for customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          phone: "01012345678",
          streetAddress: "123 Main Street",
          city: "Seoul",
          state: "Gangnam-gu",
          postalCode: "12345",
          country: "South Korea",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 4. Create order with paid items via checkout generation (includes cart setup)
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Validate order was created with paid status
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // Get the order item ID for shipment creation
  const orderItemId = order.orderItems[0]!.id;
  // 5. Seller creates initial shipment with carrier and tracking
  const initialShipment =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          orderItemIds: [orderItemId],
          carrier: "DHL",
          trackingNumber: "TRACK123",
        },
      },
    );
  typia.assert(initialShipment);
  // Validate initial shipment
  TestValidator.equals(
    "initial carrier is DHL",
    initialShipment.carrier,
    "DHL",
  );
  TestValidator.equals(
    "initial tracking is TRACK123",
    initialShipment.tracking_number,
    "TRACK123",
  );
  const shipmentId = initialShipment.id;
  const createdAt = initialShipment.created_at;
  // 6. Seller updates shipment with new tracking info
  const updatedShipment =
    await api.functional.ecommerceMall.seller.orders.shipments.update(
      sellerConnection,
      {
        orderId: order.id,
        shipmentId: shipmentId,
        body: {
          carrier: "FedEx",
          trackingNumber: "FEDEX456",
        } satisfies IEcommerceMallShipment.IUpdate,
      },
    );
  typia.assert(updatedShipment);
  // Validate updated tracking info in response
  TestValidator.equals(
    "updated carrier is FedEx",
    updatedShipment.carrier,
    "FedEx",
  );
  TestValidator.equals(
    "updated tracking is FEDEX456",
    updatedShipment.trackingNumber,
    "FEDEX456",
  );
  // Validate updatedAt timestamp is refreshed
  TestValidator.predicate(
    "updatedAt is newer than createdAt",
    updatedShipment.updatedAt > createdAt,
  );
  // Validate shipment belongs to correct order and seller
  TestValidator.equals(
    "order reference matches",
    updatedShipment.order.id,
    order.id,
  );
  TestValidator.equals(
    "seller ID matches",
    updatedShipment.seller.id,
    sellerAuth.id,
  );
}
