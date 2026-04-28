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
 * Test that confirming an already-confirmed shipment returns 409 Conflict.
 *
 * Validates the complete shipment delivery confirmation workflow including admin category setup, seller product and variant creation, customer order placement, seller shipment bundling, and customer delivery confirmation. Ensures that duplicate shipment confirmations are properly rejected by the backend.
 *
 * The shipment level idempotency constraint prevents double confirmation by checking that confirmed_at is null before processing. This protects against race conditions and duplicate delivery confirmations.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers, creates a product listing, and adds a product variant with color option.
 * 3. Customer registers and creates a shipping address.
 * 4. Customer places an order referencing the product variant.
 * 5. Seller bundles the paid order item into a shipment.
 * 6. Customer confirms the shipment delivery successfully.
 * 7. Customer attempts to confirm the same shipment again.
 * 8. System returns 409 Conflict because confirmed_at is already set.
 */
export async function test_api_shipment_double_confirmation_conflict(
  connection: api.IConnection,
): Promise<void> {
  /* === Setup Phase === */
  // 1. Admin register and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = "12345678";
  await authorize_admin_join(adminConnection, {});
  typia.assert(
    await authorize_admin_login(adminConnection, {
      body: {
        email: "admin@test.com",
        password: adminPassword,
        href: "http://localhost",
        referrer: "http://localhost",
      } satisfies IEcommercePlatformAdmin.ILogin,
    }),
  );
  // 1.1. Admin creates category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller register with known password
  const sellerPassword = "12345678";
  const sellerJoinOutput = await authorize_seller_join(connection, {
    body: { password: sellerPassword },
  });
  typia.assert(sellerJoinOutput);
  // 2.1. Seller login
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoinOutput.email,
      password: sellerPassword,
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 2.2. Seller creates product with category
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 2.3. Seller creates product variant with color option
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          options: [{ attributeKey: "color", attributeValue: "Black" }],
        },
      },
    );
  typia.assert(variant);
  // 3. Customer register with known password
  const customerPassword = "12345678";
  const customerOutput = await authorize_customer_join(connection, {
    body: { password: customerPassword },
  });
  typia.assert(customerOutput);
  // 3.1. Customer login
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerOutput.email,
      password: customerPassword,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  // 3.2. Customer creates shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 4. Customer creates order with the variant
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: product.base_price,
          },
        ],
      },
    },
  );
  typia.assert(order);
  const orderItemId = order.items[0].id;
  // 5. Seller creates shipment bundling the paid order item
  const shipment =
    await api.functional.ecommercePlatform.seller.shipments.create(
      sellerConnection,
      {
        body: {
          carrierName: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderItemId],
        } satisfies IEcommercePlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  /* === Confirmation Phase === */
  // 6. Customer confirms shipment successfully (first confirmation)
  const confirmedShipment =
    await api.functional.ecommercePlatform.customer.shipments.confirm(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {},
      },
    );
  typia.assert(confirmedShipment);
  TestValidator.predicate(
    "shipment confirmed_at is set after first confirmation",
    confirmedShipment.confirmed_at !== null,
  );
  // 7. Customer attempts to confirm the same shipment again (should fail with 409)
  await TestValidator.error(
    "duplicate shipment confirmation should return 409 conflict",
    async () => {
      await api.functional.ecommercePlatform.customer.shipments.confirm(
        customerConnection,
        {
          shipmentId: shipment.id,
          body: {},
        },
      );
    },
  );
}
