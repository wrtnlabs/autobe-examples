import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Test that a seller can successfully retrieve complete details of their own order.
 *
 * 1. Admin creates a product category
 * 2. Seller registers and creates a product with variant
 * 3. Customer registers, adds variant to cart, and checks out to create an order
 * 4. Seller retrieves the order details
 * 5. Verify order includes: order number, total price, status, shipping address, order items with snapshots, shipment info
 */
export async function test_api_seller_order_complete_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create product category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {},
  );
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `${typia.random<string & tags.Format<"uuid">>().slice(0, 8)} Category`,
        },
      },
    );
  typia.assert(category);
  // 2. Seller setup - create product with variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {},
  );
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          categoryId: category.id,
          name: "Test Product",
          description: "Test product description",
          basePrice: 10000,
        },
      },
    );
  typia.assert(product);
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
          options: [{ optionName: "Size", optionValue: "Large" }],
          price: 10000,
          stock: 100,
        },
      },
    );
  typia.assert(variant);
  // 3. Customer setup - add to cart and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  // Add variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      },
    },
  );
  // Checkout to create order
  const createdOrder: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_customer_checkout_create(
      customerConnection,
      {
        body: {
          recipientName: "Test Recipient",
          recipientPhone: "010-1234-5678",
          streetAddress: "123 Test Street",
          city: "Seoul",
          state: null,
          postalCode: "12345",
          country: "South Korea",
        },
      },
    );
  typia.assert(createdOrder);
  // 4. Seller retrieves order details
  const retrievedOrder: IEcommerceMallOrder =
    await api.functional.ecommerceMall.seller.orders.at(sellerConnection, {
      orderId: createdOrder.id,
    });
  typia.assert(retrievedOrder);
  // 5. Validate order details
  TestValidator.equals("order id matches", retrievedOrder.id, createdOrder.id);
  TestValidator.equals(
    "order number exists",
    typeof retrievedOrder.orderNumber,
    "string",
  );
  TestValidator.predicate(
    "order number is non-empty",
    retrievedOrder.orderNumber.length > 0,
  );
  TestValidator.equals("total price matches", retrievedOrder.totalPrice, 20000);
  TestValidator.equals("status exists", typeof retrievedOrder.status, "string");
  TestValidator.predicate(
    "status is valid",
    [
      "paid",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
      "partially_completed",
    ].includes(retrievedOrder.status),
  );
  // Validate shipping address
  TestValidator.equals(
    "recipient name",
    retrievedOrder.recipientName,
    "Test Recipient",
  );
  TestValidator.equals(
    "recipient phone",
    retrievedOrder.recipientPhone,
    "010-1234-5678",
  );
  TestValidator.equals(
    "street address",
    retrievedOrder.streetAddress,
    "123 Test Street",
  );
  TestValidator.equals("city", retrievedOrder.city, "Seoul");
  TestValidator.equals("state", retrievedOrder.state, null);
  TestValidator.equals("postal code", retrievedOrder.postalCode, "12345");
  TestValidator.equals("country", retrievedOrder.country, "South Korea");
  // Validate order items
  TestValidator.predicate(
    "order items array exists",
    Array.isArray(retrievedOrder.orderItems),
  );
  TestValidator.predicate(
    "order items has at least one item",
    retrievedOrder.orderItems.length >= 1,
  );
  const orderItem = retrievedOrder.orderItems[0];
  typia.assert(orderItem);
  // Validate order item exists (structure validated by typia.assert above)
  TestValidator.predicate("order item exists", orderItem !== null);
  // Validate customer information
  TestValidator.equals("customer id", retrievedOrder.customer.id, customer.id);
  TestValidator.equals(
    "customer email",
    retrievedOrder.customer.email,
    customer.email,
  );
  // Validate shipments array exists (may be empty before shipment is created)
  TestValidator.predicate(
    "shipments array exists",
    Array.isArray(retrievedOrder.shipments),
  );
  // Validate timestamps
  TestValidator.predicate(
    "createdAt is a valid date-time",
    !Number.isNaN(new Date(retrievedOrder.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt is a valid date-time",
    !Number.isNaN(new Date(retrievedOrder.updatedAt).getTime()),
  );
}