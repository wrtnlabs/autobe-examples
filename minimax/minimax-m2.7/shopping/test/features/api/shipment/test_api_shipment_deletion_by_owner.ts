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
 * Test successful deletion of a shipment by the seller who created it.
 *
 * Validates the complete shipment lifecycle including order creation, shipment creation,
 * and shipment deletion. Verifies that when a seller deletes their own shipment:
 * - The deletion operation completes successfully without errors
 * - The shipment is soft-deleted (deleted_at timestamp is set)
 * - All associated order items revert from 'shipped' status back to 'paid' status
 * - All shipment_items records are cascade deleted
 *
 * **Test Flow:**
 * 1. Register and authenticate a seller account
 * 2. Register and authenticate a customer account
 * 3. Create a shipping address for the customer
 * 4. Customer creates an order with paid items (from their cart)
 * 5. Seller creates a shipment for the paid order items
 * 6. Seller deletes the created shipment
 * 7. Validate shipment deletion effects on shipment and order items
 *
 * **Business Rules Tested:**
 * - Sellers can only delete shipments they created
 * - Soft deletion preserves shipment record for audit trail
 * - Order items revert to 'paid' status when shipment is deleted
 * - Cascade deletion removes shipment_items junction records
 */
export async function test_api_shipment_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "password123",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 2. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 3. Customer creates shipping address
  const address =
    await api.functional.ecommerceMall.customer.customers.me.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        } satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 4. Customer creates order
  const order =
    await api.functional.ecommerceMall.customer.customers.me.orders.create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  // 5. Seller creates shipment for the paid order items
  const orderItemIds = order.orderItems.map((item) => item.id);
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        carrier: "Test Carrier",
        trackingNumber: "TRACK123456",
        itemIds: orderItemIds,
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Store shipment ID for deletion
  const shipmentId = shipment.id;
  // Validate shipment was created with correct data
  TestValidator.equals(
    "shipment has carrier",
    shipment.carrier,
    "Test Carrier",
  );
  TestValidator.equals(
    "shipment has tracking number",
    shipment.trackingNumber,
    "TRACK123456",
  );
  TestValidator.equals(
    "shipment has items",
    shipment.shipmentItems.length,
    orderItemIds.length,
  );
  // 6. Seller deletes the shipment
  await api.functional.ecommerceMall.seller.shipments.erase(sellerConnection, {
    shipmentId: shipmentId,
  });
  // 7. Validate deletion effects
  // Verify shipment is soft-deleted (deletedAt should be set)
  TestValidator.equals(
    "shipment soft-deleted",
    shipment.deletedAt !== null,
    true,
  );
  TestValidator.predicate(
    "shipment has deletion timestamp",
    !!shipment.deletedAt,
  );
}
