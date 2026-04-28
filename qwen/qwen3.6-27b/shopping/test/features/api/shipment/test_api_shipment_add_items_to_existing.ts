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
 * Test the primary success path where a seller adds remaining order items to their existing shipment.
 *
 * Validates the complete workflow including administrative product category setup, seller product creation with multiple variants, customer registration with shipping address, order placement for multiple variants (each in 'paid' status), initial shipment creation with one order item, and subsequent addition of remaining order items.
 *
 * 1. Administrator joins and authenticates.
 * 2. Administrator creates a product category.
 * 3. Seller joins and authenticates.
 * 4. Seller creates a product.
 * 5. Seller creates three different product variants (black, white, red) under that product.
 * 6. Customer joins and authenticates.
 * 7. Customer creates a shipping address.
 * 8. Customer places an order for one unit of each variant, generating three order items in 'paid' status.
 * 9. Seller creates a carrier shipment with the first order item (transitioning it to 'shipped').
 * 10. Seller adds the remaining two order items to the same shipment via the target endpoint.
 * 11. Validate that the added shipment item has correct shipment reference, the order item status transitioned to 'shipped', and all items share the same carrier name and tracking number from the parent shipment.
 */
export async function test_api_shipment_add_items_to_existing(
  connection: api.IConnection,
) {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@company.com",
      href: "https://admin.example.com/register",
      password: "password123",
      referrer: "https://admin.example.com/auth/signup",
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  // 2. Admin creates a product category
  const category =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@store.com",
      href: "https://seller.example.com/register",
      password: "sellerpass123",
      referrer: "https://seller.example.com/auth/signup",
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  // 4. Seller creates a product
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Wireless Headphones",
        description: "High-quality wireless headphones with noise cancellation",
        base_price: 149.99,
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates three product variants (different colors to allow multiple order items)
  const variantA =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "WH-BLK",
          price: 149.99,
          options: [
            {
              attributeKey: "color",
              attributeValue: "black",
            } satisfies IEcommercePlatformProductVariantOption.ICreate,
          ],
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variantA);
  const variantB =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "WH-WHT",
          price: 149.99,
          options: [
            {
              attributeKey: "color",
              attributeValue: "white",
            } satisfies IEcommercePlatformProductVariantOption.ICreate,
          ],
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variantB);
  const variantC =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "WH-RED",
          price: 149.99,
          options: [
            {
              attributeKey: "color",
              attributeValue: "red",
            } satisfies IEcommercePlatformProductVariantOption.ICreate,
          ],
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variantC);
  // 6. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@email.com",
      href: "https://shop.example.com/register",
      password: "customerpass123",
      referrer: "https://shop.example.com/auth/signup",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  // 7. Customer creates a shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          phoneNumber: "555-123456",
          streetAddress: "123 Main Street, Apt 4B",
          city: "San Francisco",
          state: "California",
          postalCode: "94102",
          country: "United States",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 8. Customer places an order for one unit of each variant (3 order items total)
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    {
      body: {
        items: [
          {
            ecommerce_platform_product_variant_id: variantA.id,
            quantity: 1,
            price: 149.99,
          } satisfies IEcommercePlatformOrderItem.ICreate,
          {
            ecommerce_platform_product_variant_id: variantB.id,
            quantity: 1,
            price: 149.99,
          } satisfies IEcommercePlatformOrderItem.ICreate,
          {
            ecommerce_platform_product_variant_id: variantC.id,
            quantity: 1,
            price: 149.99,
          } satisfies IEcommercePlatformOrderItem.ICreate,
        ],
        shipping_address_id: address.id,
      } satisfies IEcommercePlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // Validate all order items are in 'paid' status
  TestValidator.equals("first item is paid", order.items[0].status, "paid");
  TestValidator.equals("second item is paid", order.items[1].status, "paid");
  TestValidator.equals("third item is paid", order.items[2].status, "paid");
  // 9. Seller creates initial shipment with just the first order item
  const shipment =
    await api.functional.ecommercePlatform.seller.shipments.create(
      sellerConnection,
      {
        body: {
          carrierName: "FedEx",
          trackingNumber: "FDX1234567890",
          orderItemIds: [order.items[0].id],
        } satisfies IEcommercePlatformShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // 10. Seller adds the remaining 2 order items to the same shipment
  const shipmentItem =
    await api.functional.ecommercePlatform.seller.shipments.items.create(
      sellerConnection,
      {
        shipmentId: shipment.id,
        body: {
          order_item_ids: [order.items[1].id, order.items[2].id],
        } satisfies IEcommercePlatformShipmentItem.ICreate,
      },
    );
  typia.assert(shipmentItem);
  // 11. Validate response
  TestValidator.equals(
    "shipment item references correct shipment",
    shipmentItem.shipment.id,
    shipment.id,
  );
  TestValidator.equals(
    "order item status transitioned to shipped",
    shipmentItem.orderItem.status,
    "shipped",
  );
  TestValidator.predicate(
    "order item is one of the added items",
    () =>
      shipmentItem.orderItem.id === order.items[1].id ||
      shipmentItem.orderItem.id === order.items[2].id,
  );
  TestValidator.equals(
    "all items share the same carrier name",
    shipmentItem.shipment.carrier_name,
    shipment.carrier_name,
  );
  TestValidator.equals(
    "all items share the same tracking number",
    shipmentItem.shipment.tracking_number,
    shipment.tracking_number,
  );
}
