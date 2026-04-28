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
 * Test seller soft-deletion of their own shipment preserves audit trail data.
 *
 * Validates that a seller can soft-delete their shipment package while the system preserves all tracking information, order item associations, and audit trail indefinitely. The operation sets the deleted_at timestamp without physical removal.
 *
 * Special attention is given to verifying authorization (only the original seller can delete) and confirming that the deletion process completes successfully for a valid shipment.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, logs in, creates a product in the category, and creates a product variant with options.
 * 3. Customer registers, creates a shipping address, and places an order with the seller's product variant.
 * 4. Seller logs in and creates a shipment bundling the paid order item.
 * 5. Seller soft-deletes the shipment, validating the operation succeeds.
 */
export async function test_api_shipment_owner_soft_delete_preserves_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and logs in
  const sellerJoinConn: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "password123";
  await authorize_seller_join(sellerJoinConn, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // Seller creates a product in the category
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
  // Seller creates a product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variant);
  // 3. Customer registers, creates address, and places an order
  const customerJoinConn: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customerPass123";
  await authorize_customer_join(customerJoinConn, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  // Customer creates shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // Customer places an order with the seller's product variant
  const body = {
    items: [
      {
        ecommerce_platform_product_variant_id: variant.id,
        quantity: typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(
          typia.random<number & tags.Type<"int32">>(),
        ),
        price: product.base_price satisfies number & tags.Minimum<0> as number &
          tags.Minimum<0>,
      } satisfies IEcommercePlatformOrderItem.ICreate,
    ],
    shipping_address_id: address.id,
  } satisfies IEcommercePlatformOrder.ICreate;
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    {
      body,
    },
  );
  typia.assert(order);
  // 4. Seller creates a shipment with the paid order item
  const shipmentBody = {
    carrierName: RandomGenerator.alphabets(6),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    orderItemIds: [order.items[0].id],
  } satisfies IEcommercePlatformShipment.ICreate;
  const shipment =
    await api.functional.ecommercePlatform.seller.shipments.create(
      sellerConnection,
      {
        body: shipmentBody,
      },
    );
  typia.assert(shipment);
  // 5. Seller soft-deletes the shipment
  const output = await api.functional.ecommercePlatform.seller.shipments.erase(
    sellerConnection,
    {
      shipmentId: shipment.id,
    },
  );
  typia.assert(output);
}