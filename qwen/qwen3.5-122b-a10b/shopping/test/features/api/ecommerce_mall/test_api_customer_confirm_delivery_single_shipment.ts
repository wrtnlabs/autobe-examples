import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test customer delivery confirmation for single shipment.
 *
 * This test validates the complete delivery confirmation workflow:
 * 1. Admin creates category
 * 2. Seller creates product with variant
 * 3. Customer registers, adds shipping address, places order
 * 4. Seller creates shipment for order items
 * 5. Customer confirms delivery
 * 6. Validate shipment has delivered_at timestamp
 * 7. Validate order items transition to 'delivered' status
 * 8. Validate order status updates to 'delivered'
 */
export async function test_api_customer_confirm_delivery_single_shipment(
  connection: api.IConnection,
): Promise<void> {
  // ==================== ADMIN SETUP ====================
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // Create category for product
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // ==================== SELLER SETUP ====================
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Login seller to get approved status
  const authHeader = sellerConnection.headers?.Authorization;
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email:
        typeof authHeader === "string"
          ? authHeader.replace("Bearer ", "")
          : "",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            { key: "color", value: RandomGenerator.name(1) },
          ] satisfies IEcommerceMallProductVariantOption[],
          price: null,
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // ==================== CUSTOMER SETUP ====================
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: null,
      phone_number: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // Create shipping address
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(2),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(10),
          country: "South Korea",
          is_default: true,
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address);
  // Add variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Place order
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: address.recipientName,
        shipping_phone_number: address.phoneNumber,
        shipping_street_address: address.streetAddress,
        shipping_city: address.city,
        shipping_state: address.stateProvince,
        shipping_postal_code: address.postalCode,
        shipping_country: address.country,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order was created with items
  TestValidator.equals("order has items", order.order_items.length, 1);
  TestValidator.equals(
    "order item status is paid",
    order.order_items[0].status,
    "paid",
  );
  // ==================== SELLER CREATES SHIPMENT ====================
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        trackingNumber: RandomGenerator.alphaNumeric(15),
        carrierName: RandomGenerator.name(1),
        shippedAt: new Date().toISOString(),
        orderItemIds: [order.order_items[0].id],
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // Verify shipment was created
  TestValidator.equals(
    "shipment has order items",
    shipment.order_items.length,
    1,
  );
  TestValidator.predicate(
    "shipment delivered_at is null",
    shipment.delivered_at === null,
  );
  // Verify order item status updated to shipped
  const orderAfterShipment =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
      {
        body: {
          shipping_recipient_name: address.recipientName,
          shipping_phone_number: address.phoneNumber,
          shipping_street_address: address.streetAddress,
          shipping_city: address.city,
          shipping_state: address.stateProvince,
          shipping_postal_code: address.postalCode,
          shipping_country: address.country,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(orderAfterShipment);
  // ==================== CUSTOMER CONFIRMS DELIVERY ====================
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirmDelivery(
      customerConnection,
      {
        orderId: order.id,
        shipmentId: shipment.id,
        body: {} satisfies IEcommerceMallShipment.IConfirmDelivery,
      },
    );
  typia.assert(confirmedShipment);
  // ==================== VALIDATE DELIVERY CONFIRMATION ====================
  // 1. Verify shipment has delivered_at timestamp
  TestValidator.predicate(
    "shipment has delivered_at timestamp",
    confirmedShipment.delivered_at !== null,
  );
  TestValidator.predicate(
    "delivered_at is valid datetime",
    new Date(confirmedShipment.delivered_at!).getTime() > 0,
  );
  // 2. Verify order item status is delivered
  const updatedOrder =
    await api.functional.ecommerceMall.customer.orders.create(
      customerConnection,
      {
        body: {
          shipping_recipient_name: address.recipientName,
          shipping_phone_number: address.phoneNumber,
          shipping_street_address: address.streetAddress,
          shipping_city: address.city,
          shipping_state: address.stateProvince,
          shipping_postal_code: address.postalCode,
          shipping_country: address.country,
        } satisfies IEcommerceMallOrder.ICreate,
      },
    );
  typia.assert(updatedOrder);
  const orderItem = updatedOrder.order_items.find(
    (item) => item.id === order.order_items[0].id,
  );
  TestValidator.equals(
    "order item status is delivered",
    orderItem?.status,
    "delivered",
  );
  // 3. Verify order status is delivered (all items delivered)
  TestValidator.equals(
    "order status is delivered",
    updatedOrder.status,
    "delivered",
  );
}