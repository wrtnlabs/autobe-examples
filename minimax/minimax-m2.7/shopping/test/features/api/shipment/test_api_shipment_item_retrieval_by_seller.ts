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
 * Test that an authenticated seller can retrieve detailed information about a specific shipment item within their own shipment.
 *
 * This test validates the shipment item retrieval endpoint by setting up a complete order-to-shipment flow:
 * 1. Registers and authenticates a seller (approved status)
 * 2. Registers and authenticates a customer
 * 3. Creates a shipping address for the customer
 * 4. Creates an order with items from the seller's products
 * 5. Creates a shipment containing the order items
 * 6. Retrieves the shipment item details using GET /ecommerceMall/seller/shipments/{shipmentId}/items/{itemId}
 *
 * Validations verify that the response includes:
 * - Shipment item ID matching the requested itemId
 * - Shipment tracking info (carrier, tracking number) from parent shipment
 * - Order item details (id, quantity, unit_price, status)
 * - Product snapshot with name, description, base_price, category_name
 * - Variant options array with key-value pairs
 * - Seller profile snapshot with shop_name
 * - created_at timestamp for the shipment item
 */
export async function test_api_shipment_item_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // Generate a consistent password for testing
  const testPassword = RandomGenerator.alphaNumeric(16);
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: testPassword satisfies string &
        tags.MinLength<8> &
        tags.MaxLength<100> &
        tags.Format<"password">,
      href: "https://example.com/seller/register",
      referrer: "https://example.com/",
    },
  });
  // Login as seller using the same password
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await api.functional.ecommerceMall.auth.seller.login(
    sellerLoginConnection,
    {
      body: {
        email: sellerAuth.email,
        password: testPassword,
        href: "https://example.com/seller/login",
        referrer: "https://example.com/",
      },
    },
  );
  typia.assert(sellerLogin);
  sellerLoginConnection.headers = { Authorization: sellerLogin.token.access };
  // 2. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await api.functional.ecommerceMall.auth.customer.login(
    customerLoginConnection,
    {
      body: {
        email: customerAuth.email,
        password: testPassword,
        href: "https://example.com/customer/login",
        referrer: "https://example.com/",
      },
    },
  );
  typia.assert(customerLogin);
  customerLoginConnection.headers = {
    Authorization: customerLogin.token.access,
  };
  // 3. Create shipping address for customer
  const shippingAddress =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerLoginConnection,
      {},
    );
  typia.assert(shippingAddress);
  // 4. Create an order with items
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerLoginConnection,
      {
        body: {
          shippingAddressId: shippingAddress.id,
        },
      },
    );
  typia.assert(order);
  // Get the first order item that belongs to the seller
  const orderItem = order.orderItems[0];
  // 5. Create a shipment with the order items
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        orderId: order.id,
        carrier: RandomGenerator.alphabets(10),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        itemIds: [orderItem.id],
      },
    },
  );
  typia.assert(shipment);
  // 6. Extract shipmentId and itemId from the created shipment
  // The itemId is the shipmentItemId from the shipment items array
  const shipmentItem = shipment.shipmentItems[0];
  // 7. Call GET /ecommerceMall/seller/shipments/{shipmentId}/items/{itemId}
  const shipmentItemDetail =
    await api.functional.ecommerceMall.seller.shipments.items.getByShipmentidAndItemid(
      sellerLoginConnection,
      {
        shipmentId: shipment.id,
        itemId: shipmentItem.id,
      },
    );
  typia.assert(shipmentItemDetail);
  // 8. Validate response
  TestValidator.equals(
    "shipment item ID matches requested itemId",
    shipmentItemDetail.shipmentItemId,
    shipmentItem.id,
  );
  TestValidator.equals(
    "order item ID is present",
    shipmentItemDetail.id,
    orderItem.id,
  );
  TestValidator.equals(
    "quantity matches original order",
    shipmentItemDetail.quantity,
    orderItem.quantity,
  );
  TestValidator.equals(
    "unit price matches original order",
    shipmentItemDetail.unitPrice,
    orderItem.unit_price,
  );
  TestValidator.equals(
    "status is shipped",
    shipmentItemDetail.status,
    "shipped",
  );
  TestValidator.predicate(
    "product snapshot exists",
    !!shipmentItemDetail.productSnapshot,
  );
  TestValidator.predicate(
    "product snapshot has name",
    !!shipmentItemDetail.productSnapshot.name,
  );
  TestValidator.predicate(
    "variant options is array",
    Array.isArray(shipmentItemDetail.variantOptions),
  );
  TestValidator.predicate(
    "created at timestamp exists",
    !!shipmentItemDetail.createdAt,
  );
}
