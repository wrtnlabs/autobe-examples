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
 * Test retrieving specific shipment items from a shipment containing multiple order items (same seller bundling).
 *
 * Validates the complete bundled shipment workflow including administrative category setup, seller product creation with multiple variants, customer order placement with both variants, and shipment creation bundling both items together. Ensures that individual shipment items can be retrieved and that they correctly reference the same parent shipment while pointing to different order items.
 *
 * Special attention is given to verifying that both shipment items share the same shipment reference but have unique order item associations, and that the order item status transitions to 'shipped' after being bundled into the shipment package.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins the platform.
 * 3. Seller creates a product assigned to the category.
 * 4. Seller creates first product variant with unique SKU and options.
 * 5. Seller creates second product variant with different SKU and options.
 * 6. Customer joins the platform and creates a shipping address.
 * 7. Customer places an order containing both product variants (two order items).
 * 8. Seller creates a shipment bundling both paid order items.
 * 9. Retrieve first shipment item by shipmentId and shipmentItemId.
 * 10. Retrieve second shipment item by shipmentId and shipmentItemId.
 * 11. Validate that both shipment items reference the same shipment but different order items.
 * 12. Validate that both order items have status 'shipped'.
 */
export async function test_api_shipment_item_multiple_items_same_shipment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2-5. Seller joins, creates product with two variants
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  const variant1 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { skuCode: `SKU-VARIANT-001-${RandomGenerator.alphaNumeric(8)}` },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: { skuCode: `SKU-VARIANT-002-${RandomGenerator.alphaNumeric(8)}` },
      },
    );
  typia.assert(variant2);
  // 6. Customer joins and creates shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 7. Customer places order containing both product variants
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        items: [
          {
            ecommerce_platform_product_variant_id: variant1.id,
            quantity: 1,
            price: variant1.price ?? product.base_price,
          } satisfies IEcommercePlatformOrderItem.ICreate,
          {
            ecommerce_platform_product_variant_id: variant2.id,
            quantity: 1,
            price: variant2.price ?? product.base_price,
          } satisfies IEcommercePlatformOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order);
  // Get order item IDs from the created order
  const orderItemIds = order.items.map((item) => item.id);
  // 8. Seller creates shipment bundling both order items
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      {
        body: { orderItemIds },
      },
    );
  typia.assert(shipment);
  // Get shipment item IDs
  const shipmentItemIds = shipment.shipmentItems.map((si) => si.id);
  // 9-10. Retrieve each shipment item individually
  const retrievedItem1 =
    await api.functional.ecommercePlatform.seller.shipments.items.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
        shipmentItemId: shipmentItemIds[0],
      },
    );
  typia.assert(retrievedItem1);
  const retrievedItem2 =
    await api.functional.ecommercePlatform.seller.shipments.items.at(
      sellerConnection,
      {
        shipmentId: shipment.id,
        shipmentItemId: shipmentItemIds[1],
      },
    );
  typia.assert(retrievedItem2);
  // 11-12. Validate results
  TestValidator.equals(
    "first shipment item id matches",
    retrievedItem1.id,
    shipmentItemIds[0],
  );
  TestValidator.equals(
    "second shipment item id matches",
    retrievedItem2.id,
    shipmentItemIds[1],
  );
  TestValidator.notEquals(
    "shipment items have unique IDs",
    retrievedItem1.id,
    retrievedItem2.id,
  );
  TestValidator.equals(
    "both order items belong to same order",
    retrievedItem1.orderItem.order.id,
    retrievedItem2.orderItem.order.id,
  );
  TestValidator.notEquals(
    "shipment items reference different order items",
    retrievedItem1.orderItem.id,
    retrievedItem2.orderItem.id,
  );
  TestValidator.equals(
    "both belong to same shipment",
    retrievedItem1.shipment.id,
    retrievedItem2.shipment.id,
  );
  TestValidator.equals(
    "first order item is shipped",
    retrievedItem1.orderItem.status,
    "shipped",
  );
  TestValidator.equals(
    "second order item is shipped",
    retrievedItem2.orderItem.status,
    "shipped",
  );
  TestValidator.predicate(
    "shipment contains 2 items",
    shipment.shipment_items_count === 2,
  );
}
