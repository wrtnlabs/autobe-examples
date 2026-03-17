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
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test customer order creation from shopping cart.
 *
 * This test validates the complete checkout flow:
 * 1. Admin creates a category for product classification
 * 2. Seller registers, logs in, and creates a product with variants
 * 3. Customer registers and logs in
 * 4. Customer creates a shipping address
 * 5. Customer adds multiple product variants to cart
 * 6. Customer creates an order from cart
 * 7. Validate order details and order items
 */
export async function test_api_customer_order_creation_from_cart(
  connection: api.IConnection,
): Promise<void> {
  // ========== SETUP: Admin creates category ==========
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
        },
      },
    );
  typia.assert(category);
  // ========== SETUP: Seller creates product with variants ==========
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerAuth);
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category_id: category.id,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // Create first variant
  const variant1: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(variant1);
  // Create second variant
  const variant2: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(variant2);
  // ========== SETUP: Customer registers and logs in ==========
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customerAuth);
  // ========== SETUP: Customer creates shipping address ==========
  const address: IEcommerceMallAddress =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(2),
          phone_number: RandomGenerator.mobile(),
          street_address: `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>()} ${RandomGenerator.name(2)} Street`,
          city: RandomGenerator.name(2),
          state_province: RandomGenerator.name(2),
          postal_code: typia.random<
            string & tags.MinLength<5> & tags.MaxLength<10>
          >(),
          country: "South Korea",
        },
      },
    );
  typia.assert(address);
  // ========== SETUP: Customer adds variants to cart ==========
  const quantity1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >();
  const quantity2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >();
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant1.id,
        quantity: quantity1,
      },
    },
  );
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant2.id,
        quantity: quantity2,
      },
    },
  );
  // ========== ACTION: Customer creates order from cart ==========
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_customer_orders_create(
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
          address_id: address.id,
        },
      },
    );
  typia.assert(order);
  // ========== VALIDATION: Order details ==========
  TestValidator.equals("order has order number", order.order_number.length, 36);
  TestValidator.equals("order status is paid", order.status, "paid");
  TestValidator.equals(
    "order has customer",
    order.customer.id,
    customerAuth.id,
  );
  TestValidator.predicate("order has total price", order.total_price > 0);
  // ========== VALIDATION: Order items ==========
  TestValidator.predicate(
    "order has 2 order items",
    order.order_items.length === 2,
  );
  const orderItem1 = order.order_items.find(
    (item) => item.productVariant.id === variant1.id,
  );
  const orderItem2 = order.order_items.find(
    (item) => item.productVariant.id === variant2.id,
  );
  TestValidator.predicate(
    "found order item for variant 1",
    orderItem1 !== undefined,
  );
  TestValidator.predicate(
    "found order item for variant 2",
    orderItem2 !== undefined,
  );
  if (orderItem1 && orderItem2) {
    TestValidator.equals(
      "order item 1 quantity",
      orderItem1.quantity,
      quantity1,
    );
    TestValidator.equals(
      "order item 2 quantity",
      orderItem2.quantity,
      quantity2,
    );
    TestValidator.predicate(
      "order item 1 has unit price",
      orderItem1.unitPrice > 0,
    );
    TestValidator.predicate(
      "order item 2 has unit price",
      orderItem2.unitPrice > 0,
    );
    TestValidator.equals("order item 1 status", orderItem1.status, "paid");
    TestValidator.equals("order item 2 status", orderItem2.status, "paid");
  }
}
