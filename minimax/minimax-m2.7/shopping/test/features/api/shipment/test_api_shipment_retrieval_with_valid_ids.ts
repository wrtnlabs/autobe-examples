import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
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
import { generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_shipment_retrieval_with_valid_ids(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Create shipping address
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
  // 3. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates product - using a placeholder category ID for test
  // In real scenario, category would be created by admin first
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "A test product description",
        categoryId: "00000000-0000-0000-0000-000000000001" as string &
          tags.Format<"uuid">,
        basePrice: 10000,
      },
    },
  );
  // 5. Seller creates variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: "TEST-SKU-001",
          quantity: 10,
          optionValues: [
            { key: "color", value: "red" },
            { key: "size", value: "large" },
          ],
        },
      },
    );
  // 6. Seller adds inventory
  await generate_random_ecommerce_mall_seller_ecommerce_mall_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity: 50,
        operationType: "restock",
        reason: "Initial stock",
      },
    },
  );
  // 7. Customer adds item to cart
  const cartItem =
    await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Customer completes checkout
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  // Validate order status is paid
  TestValidator.equals("order status is paid", order.status, "paid");
  // 9. Seller creates shipment for the order
  const shipmentCarrier = "DHL";
  const shipmentTrackingNumber = "1234567890";
  const paidOrderItems = order.orderItems.filter(
    (item) => item.status === "paid",
  );
  const shipment =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: { orderId: order.id },
        body: {
          orderItemIds: paidOrderItems.map((item) => item.id),
          carrier: shipmentCarrier,
          trackingNumber: shipmentTrackingNumber,
        },
      },
    );
  // 10. Retrieve shipment details using orderId and shipmentId
  const retrievedShipment =
    await api.functional.ecommerceMall.orders.shipments.at(customerConnection, {
      orderId: order.id,
      shipmentId: shipment.id,
    });
  // Validate response with typia.assert
  typia.assert(retrievedShipment);
  // Validate carrier matches
  TestValidator.equals(
    "carrier matches",
    retrievedShipment.carrier,
    shipmentCarrier,
  );
  // Validate tracking number matches
  TestValidator.equals(
    "tracking number matches",
    retrievedShipment.tracking_number,
    shipmentTrackingNumber,
  );
  // Validate shipment items array is present and contains at least one item
  TestValidator.predicate(
    "has shipment items",
    retrievedShipment.shipmentItems.length >= 1,
  );
  // Validate shipment items include order item details
  const shipmentItem = retrievedShipment.shipmentItems[0];
  TestValidator.predicate("has order item", !!shipmentItem.orderItem);
  TestValidator.equals("quantity matches", shipmentItem.orderItem.quantity, 2);
  TestValidator.predicate(
    "has unit price",
    shipmentItem.orderItem.unitPrice > 0,
  );
  // Validate seller information is present
  TestValidator.predicate("has seller info", !!retrievedShipment.seller);
  TestValidator.equals(
    "seller id matches",
    retrievedShipment.seller.id,
    sellerAuth.id,
  );
  // Validate created_at timestamp exists
  TestValidator.predicate("has created_at", !!retrievedShipment.created_at);
}
