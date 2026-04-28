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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Validates the complete shipment retrieval workflow from product setup through order fulfillment.
 *
 * Tests the primary shipment retrieval happy path where a seller creates a shipment bundling paid order items, then retrieves the shipment details to verify all fields are correctly populated. The workflow includes administrative product setup, customer order placement, and seller shipment creation.
 *
 * Ensures that the shipment response contains the shipment ID, carrier name, tracking number, shipped_at timestamp, null confirmed_at and delivered_at fields (since no confirmation yet), seller summary, and the populated shipmentItems array with bundled order item references.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins and creates a product with a variant in the category.
 * 3. Customer joins and creates a shipping address.
 * 4. Customer creates an order purchasing the product variant.
 * 5. Seller creates a shipment bundling the order items with carrier tracking.
 * 6. Seller retrieves the shipment details by ID to validate the complete response.
 */
export async function test_api_shipment_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  /* 1. Admin creates a product category */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  /* 2. Seller creates a product and variant */
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        },
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { body: undefined, params: { productId: product.id } },
    );
  typia.assert(variant);
  /* 3. Customer joins and creates shipping address */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  /* 4. Customer creates an order with the product variant */
  const variantId: string & tags.Format<"uuid"> = variant.id;
  const price: number = (variant.price ??
    product.base_price) satisfies number as number;
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        items: [
          {
            ecommerce_platform_product_variant_id: variantId,
            quantity: 1 satisfies number as number,
            price,
          },
        ],
      } satisfies IEcommercePlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  /* 5. Seller creates a shipment bundling the order items */
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      {
        body: {
          carrierName: "TestCarrier",
          trackingNumber: "TRACK001",
          orderItemIds: [order.items[0].id],
        } satisfies IEcommercePlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  /* 6. Seller retrieves the shipment by ID */
  const retrievedShipment =
    await api.functional.ecommercePlatform.seller.shipments.at(
      sellerConnection,
      { shipmentId: shipment.id },
    );
  typia.assert(retrievedShipment);
  /* Validate response fields */
  TestValidator.equals(
    "shipment ID matches",
    retrievedShipment.id,
    shipment.id,
  );
  TestValidator.predicate(
    "has carrier name",
    retrievedShipment.carrier_name.length > 0,
  );
  TestValidator.predicate(
    "has tracking number",
    retrievedShipment.tracking_number.length > 0,
  );
  TestValidator.predicate(
    "shipped_at is set",
    retrievedShipment.shipped_at.length > 0,
  );
  TestValidator.equals(
    "confirmed_at is null",
    retrievedShipment.confirmed_at,
    null,
  );
  TestValidator.equals(
    "delivered_at is null",
    retrievedShipment.delivered_at,
    null,
  );
  TestValidator.equals(
    "shipment items count",
    retrievedShipment.shipment_items_count,
    1,
  );
  TestValidator.predicate(
    "has seller info",
    retrievedShipment.seller.email.length > 0,
  );
}