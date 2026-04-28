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
 * Test that confirming a shipment with multiple order items transitions ALL contained items to delivered status simultaneously.
 *
 * Validates the complete shipment-level delivery confirmation flow including administrative product category setup, seller product listing with multiple variants, customer order placement with multiple items from the same seller, seller shipment bundling, and customer delivery confirmation. Ensures that confirming a shipment atomically updates all bundled order items from shipped to delivered status and sets the shipment's confirmation timestamps.
 *
 * Special attention is given to verifying that the shipment-level confirmation affects all contained order items simultaneously, demonstrating proper order item status grouping by seller into shipments.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product with two variants.
 * 3. Customer registers and creates a shipping address.
 * 4. Customer places an order with multiple items from the seller's variants.
 * 5. Seller bundles all order items into a single shipment.
 * 6. Customer confirms delivery of the shipment.
 * 7. Validates shipment timestamps and all order items are delivered.
 */
export async function test_api_shipment_multi_item_delivery_confirmation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and logs in
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@gmail.com`;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: { email: adminEmail, password: adminPassword },
  });
  typia.assert(adminJoin);
  const adminLoginConn: api.IConnection = { host: connection.host };
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformAdmin.ILogin;
  await authorize_admin_login(adminLoginConn, { body: adminLoginBody });
  // Admin creates product category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminLoginConn,
      {},
    );
  typia.assert(category);
  // 2. Seller registers and logs in
  const sellerEmail = `${RandomGenerator.alphaNumeric(10)}@gmail.com`;
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConn: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerJoinConn, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  typia.assert(sellerJoin);
  const sellerLoginConn: api.IConnection = { host: connection.host };
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformSeller.ILogin;
  await authorize_seller_login(sellerLoginConn, { body: sellerLoginBody });
  // Seller creates product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerLoginConn,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // Seller creates two variants
  const variant1 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerLoginConn,
      { params: { productId: product.id }, body: {} },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerLoginConn,
      { params: { productId: product.id }, body: {} },
    );
  typia.assert(variant2);
  // 3. Customer registers and logs in
  const customerEmail = `${RandomGenerator.alphaNumeric(10)}@gmail.com`;
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerJoinConn: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerJoinConn, {
    body: { email: customerEmail, password: customerPassword },
  });
  typia.assert(customerJoin);
  const customerLoginConn: api.IConnection = { host: connection.host };
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
  } satisfies IEcommercePlatformCustomer.ILogin;
  await authorize_customer_login(customerLoginConn, {
    body: customerLoginBody,
  });
  // Customer creates shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerLoginConn,
      {},
    );
  typia.assert(address);
  // 4. Customer places order with multiple items from same seller's variants
  const orderItems = [
    {
      ecommerce_platform_product_variant_id: variant1.id,
      quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      price: typia.random<number & tags.Minimum<0>>(),
    } satisfies IEcommercePlatformOrderItem.ICreate,
    {
      ecommerce_platform_product_variant_id: variant2.id,
      quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      price: typia.random<number & tags.Minimum<0>>(),
    } satisfies IEcommercePlatformOrderItem.ICreate,
  ];
  const orderBody = {
    items: orderItems,
    shipping_address_id: address.id,
  } satisfies IEcommercePlatformOrder.ICreate;
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerLoginConn,
    { body: orderBody },
  );
  typia.assert(order);
  // 5. Seller bundles all order items into a single shipment
  const orderItemIds: (string & tags.Format<"uuid">)[] = order.items.map(
    (item) => item.id,
  );
  const shipmentBody = {
    carrierName: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 2,
      wordMax: 5,
    }),
    trackingNumber: RandomGenerator.alphaNumeric(12),
    orderItemIds,
  } satisfies IEcommercePlatformShipment.ICreate;
  const shipment =
    await api.functional.ecommercePlatform.seller.shipments.create(
      sellerLoginConn,
      { body: shipmentBody },
    );
  typia.assert(shipment);
  // 6. Customer confirms delivery of the shipment
  const confirmedShipment =
    await api.functional.ecommercePlatform.customer.shipments.confirm(
      customerLoginConn,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(confirmedShipment);
  // 7. Validate shipment confirmation timestamps are set
  TestValidator.predicate(
    "shipment confirmed_at is set",
    confirmedShipment.confirmed_at !== null,
  );
  TestValidator.predicate(
    "shipment delivered_at is set",
    confirmedShipment.delivered_at !== null,
  );
  // Validate all order items are delivered
  const deliveredItems = confirmedShipment.shipmentItems.map(
    (si) => si.orderItem,
  );
  TestValidator.equals(
    "all items count matches",
    deliveredItems.length,
    order.items.length,
  );
  await TestValidator.predicate("all items have delivered status", () =>
    deliveredItems.every((item) => item.status === "delivered"),
  );
}
