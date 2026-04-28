import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { generate_random_ecommerce_platform_seller_shipments_items_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_items_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipment_item } from "../../../prepare/prepare_random_ecommerce_platform_shipment_item";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test retrieving a specific shipment item through the complete order fulfillment lifecycle.
 *
 * Validates the complete order-to-shipment flow from product creation through shipment retrieval. Creates an admin account for category management, a seller account for product and shipment operations, and a customer account for order placement. The fulfillment chain progresses through product creation, variant configuration, customer checkout, seller dispatch, and final shipment item retrieval.
 *
 * Special attention is given to verifying the junction record integrity, including foreign key relationships between shipment and order item, correct status transitions from 'paid' to 'shipped', and accurate audit timestamp recording throughout the lifecycle.
 *
 * 1. Admin joins and creates a category for product classification.
 * 2. Seller joins the platform.
 * 3. Seller creates a product assigned to the admin-created category.
 * 4. Seller creates a product variant with SKU code, options, and price.
 * 5. Customer joins the platform.
 * 6. Customer creates a shipping address for delivery.
 * 7. Customer places an order containing the product variant.
 * 8. Seller creates a shipment package with carrier name, tracking number, and the order item.
 * 9. Retrieve the specific shipment item record by shipmentId and shipmentItemId.
 * 10. Validates shipment and orderItem references, status transitions, and audit fields.
 */
export async function test_api_shipment_item_retrieval_from_fulfillment_chain(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Admin creates category for product classification
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 4. Seller creates product assigned to the category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 5. Seller creates product variant with SKU code, options, and price
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Customer creates shipping address for delivery
  const shippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(shippingAddress);
  // 8. Customer places order containing the product variant
  const orderItemCreate: IEcommercePlatformOrderItem.ICreate = {
    ecommerce_platform_product_variant_id: variant.id,
    quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    price: variant.price ?? product.base_price,
  };
  const orderCreate = {
    items: [orderItemCreate],
    shipping_address_id: shippingAddress.id,
  } satisfies IEcommercePlatformOrder.ICreate;
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    { body: orderCreate },
  );
  typia.assert(order);
  const orderItem = order.items[0];
  // 9. Seller creates shipment package with carrier name and tracking number, including the order item
  const shipmentCreate = {
    carrierName: RandomGenerator.alphaNumeric(6),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    orderItemIds: [orderItem.id],
  } satisfies IEcommercePlatformShipment.ICreate;
  const shipment =
    await api.functional.ecommercePlatform.seller.shipments.create(
      sellerConnection,
      { body: shipmentCreate },
    );
  typia.assert(shipment);
  // Get the shipment item from the created shipment
  const shipmentItem = shipment.shipmentItems[0];
  // 10. Retrieve the specific shipment item record by shipmentId and shipmentItemId
  const retrievedShipmentItem =
    await api.functional.ecommercePlatform.seller.shipments.items.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
        shipmentItemId: shipmentItem.id,
      },
    );
  typia.assert(retrievedShipmentItem);
  // Validate the retrieved shipment item
  TestValidator.equals(
    "shipment item id matches",
    retrievedShipmentItem.id,
    shipmentItem.id,
  );
  TestValidator.equals(
    "shipment reference id matches",
    retrievedShipmentItem.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "order item reference id matches",
    retrievedShipmentItem.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "order item status is shipped",
    retrievedShipmentItem.orderItem.status,
    "shipped",
  );
  TestValidator.predicate(
    "shipment has carrier name",
    retrievedShipmentItem.shipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "shipment has tracking number",
    retrievedShipmentItem.shipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp is valid",
    retrievedShipmentItem.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    retrievedShipmentItem.updated_at !== undefined,
  );
}
