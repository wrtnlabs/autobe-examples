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
 * Test retrieving a shipment returns order items with frozen product snapshots.
 *
 * Validates that shipment items preserve the exact product state as they existed at the moment of order creation. This test ensures snapshot immutability by checking that retrieved shipment data contains:
 * - Product snapshot with id, name, description, basePrice, categoryName, createdAt
 * - Variant options showing exact key-value pairs selected at purchase time
 * - Quantity and unitPrice frozen at order creation
 * - Status set to "shipped" after shipment creation
 * - Timestamps preserved from order placement
 *
 * 1. Seller joins and logs in (requires admin approval for full access)
 * 2. Customer joins and logs in
 * 3. Customer creates shipping address
 * 4. Customer creates order (snapshots are frozen at this point)
 * 5. Seller creates shipment for order items
 * 6. Seller retrieves the shipment by ID
 * 7. Validates all shipment items contain complete frozen snapshot data
 */
export async function test_api_shipment_order_items_frozen_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 2. Customer setup - create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  customerConnection.headers = { Authorization: customerAuth.token.access };
  // 3. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Customer creates order with items (this freezes product snapshots)
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // 5. Seller creates shipment for the order items
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        carrier: "Test Carrier",
        trackingNumber: "TEST-TRACK-123456",
        itemIds: orderItemIds,
      },
    },
  );
  typia.assert(shipment);
  // 6. Retrieve the shipment by ID to verify frozen snapshots
  const retrievedShipment =
    await api.functional.ecommerceMall.seller.shipments.at(sellerConnection, {
      shipmentId: shipment.id,
    });
  typia.assert(retrievedShipment);
  // 7. Validate shipment structure and frozen snapshots
  TestValidator.equals(
    "shipment has items",
    retrievedShipment.shipmentItems.length > 0,
    true,
  );
  TestValidator.equals(
    "shipment has carrier",
    retrievedShipment.carrier,
    "Test Carrier",
  );
  TestValidator.equals(
    "shipment has tracking number",
    retrievedShipment.trackingNumber,
    "TEST-TRACK-123456",
  );
  // Validate each shipment item contains frozen snapshots
  for (const item of retrievedShipment.shipmentItems) {
    // Validate product snapshot
    TestValidator.predicate(
      "productSnapshot exists",
      item.productSnapshot !== undefined,
    );
    TestValidator.predicate(
      "productSnapshot has id",
      item.productSnapshot.id !== undefined,
    );
    TestValidator.predicate(
      "productSnapshot has name",
      item.productSnapshot.name !== undefined,
    );
    TestValidator.predicate(
      "productSnapshot has description",
      item.productSnapshot.description !== undefined,
    );
    TestValidator.predicate(
      "productSnapshot has basePrice",
      typeof item.productSnapshot.basePrice === "number",
    );
    TestValidator.predicate(
      "productSnapshot has categoryName",
      item.productSnapshot.categoryName !== undefined,
    );
    TestValidator.predicate(
      "productSnapshot has createdAt",
      item.productSnapshot.createdAt !== undefined,
    );
    // Validate variant options (key-value pairs as object properties)
    TestValidator.predicate(
      "variantOptions exists",
      item.variantOptions !== undefined,
    );
    TestValidator.predicate(
      "variantOptions has key",
      (item.variantOptions as IEcommerceMallProductSnapshotVariant).key !== undefined,
    );
    TestValidator.predicate(
      "variantOptions has value",
      (item.variantOptions as IEcommerceMallProductSnapshotVariant).value !== undefined,
    );
    // Validate frozen transaction fields
    TestValidator.predicate("item has quantity", item.quantity > 0);
    TestValidator.predicate(
      "item has unitPrice",
      typeof item.unitPrice === "number",
    );
    TestValidator.predicate("item has status", item.status === "shipped");
    TestValidator.predicate("item has createdAt", item.createdAt !== undefined);
  }
}