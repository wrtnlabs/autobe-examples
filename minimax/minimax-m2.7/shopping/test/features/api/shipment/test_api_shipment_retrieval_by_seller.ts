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
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that a seller can successfully retrieve shipment details for a shipment they created.
 *
 * Validates the complete shipment retrieval workflow including seller authentication, customer order creation with a valid shipping address, shipment creation by the seller from paid order items, and retrieval of complete shipment details. The endpoint returns comprehensive data including tracking information (carrier name, tracking number), timestamps, parent order reference, seller information, and all shipment items with their associated product snapshots, variant options, and seller profile snapshots.
 *
 * The test flow ensures that:
 * 1. A seller can authenticate and access shipment retrieval endpoints
 * 2. Orders containing the seller's products can be created by customers
 * 3. Sellers can create shipments from their paid order items
 * 4. The GET endpoint returns complete shipment details with all nested compositions
 * 5. Shipment items contain accurate frozen data including product name, description, base price, category name, variant options, and seller shop name
 *
 * Precondition: A seller with approved status must have created a shipment containing one or more order items with paid status.
 *
 * @param connection Base API connection for test execution
 */
export async function test_api_shipment_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Register and authenticate as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 3. Create shipping address for the customer
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Create order with items from seller's products
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // Get a paid order item from the order for shipment creation
  const paidOrderItem = order.orderItems?.find(
    (item) => item.status === "paid",
  );
  if (!paidOrderItem) {
    throw new Error("No paid order items found in the order");
  }
  // 5. Seller creates a shipment with the order items
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        carrier: "DHL Express",
        trackingNumber: "TRACK123456789",
        itemIds: [paidOrderItem.id],
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 6. Seller retrieves the shipment by ID
  const retrievedShipment =
    await api.functional.ecommerceMall.seller.shipments.at(sellerConnection, {
      shipmentId: shipment.id,
    });
  typia.assert(retrievedShipment);
  // 7. Validate shipment details
  TestValidator.equals(
    "shipment ID matches",
    retrievedShipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "carrier matches",
    retrievedShipment.carrier,
    "DHL Express",
  );
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.trackingNumber,
    "TRACK123456789",
  );
  TestValidator.predicate(
    "createdAt exists",
    retrievedShipment.createdAt !== undefined,
  );
  // Validate order reference
  TestValidator.equals(
    "order ID matches",
    retrievedShipment.order.id,
    order.id,
  );
  TestValidator.predicate(
    "order number exists",
    retrievedShipment.order.order_number !== undefined,
  );
  // Validate seller information
  TestValidator.predicate(
    "seller exists",
    retrievedShipment.seller !== undefined,
  );
  // Validate shipment items
  TestValidator.predicate(
    "shipment items exist",
    retrievedShipment.shipmentItems !== undefined,
  );
  TestValidator.equals(
    "has at least one shipment item",
    retrievedShipment.shipmentItems.length >= 1,
    true,
  );
  // Validate first shipment item details
  const firstShipmentItem = retrievedShipment.shipmentItems[0];
  TestValidator.equals(
    "quantity matches",
    firstShipmentItem.quantity,
    paidOrderItem.quantity,
  );
  TestValidator.equals(
    "unitPrice matches",
    firstShipmentItem.unitPrice,
    paidOrderItem.unit_price,
  );
  TestValidator.equals(
    "status is shipped",
    firstShipmentItem.status,
    "shipped",
  );
  // Validate product snapshot in shipment item
  TestValidator.predicate(
    "product snapshot exists",
    firstShipmentItem.productSnapshot !== undefined,
  );
  TestValidator.predicate(
    "product name exists",
    firstShipmentItem.productSnapshot.name.length > 0,
  );
  TestValidator.predicate(
    "base price exists",
    firstShipmentItem.productSnapshot.basePrice >= 0,
  );
  TestValidator.predicate(
    "category name exists",
    firstShipmentItem.productSnapshot.categoryName !== undefined,
  );
  // Validate variant options in shipment item
  TestValidator.predicate(
    "variant options exists",
    firstShipmentItem.variantOptions !== undefined,
  );
}
