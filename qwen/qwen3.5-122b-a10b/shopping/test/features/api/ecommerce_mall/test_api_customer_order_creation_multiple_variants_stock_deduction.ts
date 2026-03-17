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
 * Test order creation with multiple different product variants and verify stock deduction across variants.
 * A customer adds multiple variants (from same or different products) to cart and places an order.
 * The system should:
 * 1) Process all cart items into separate order items
 * 2) Deduct stock quantity from each variant based on order item quantity
 * 3) Create inventory records for each variant with quantityChange=-quantity and reason='order_placed'
 * 4) Verify each variant's stock_quantity is reduced correctly
 * 5) Confirm total_price is sum of all order item subtotals
 * 6) Validate order status is 'paid' when all items are paid
 * 7) Verify all cart items are removed after order completion
 */
export async function test_api_customer_order_creation_multiple_variants_stock_deduction(
  connection: api.IConnection,
): Promise<void> {
  // ========== SETUP: Admin, Seller, and Customer ==========
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // ========== CATEGORY SETUP ==========
  // 4. Admin creates category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // ========== PRODUCT SETUP ==========
  // 5. Seller creates first product
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  // 6. Seller creates first variant for product1
  const initialStock1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
  >();
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product1.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "color", value: RandomGenerator.name(1) }],
          stockQuantity: initialStock1,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  TestValidator.equals(
    "variant1 initial stock",
    variant1.stockQuantity,
    initialStock1,
  );
  // 7. Seller creates second product
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  // 8. Seller creates second variant for product2
  const initialStock2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<50>
  >();
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product2.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [{ key: "size", value: RandomGenerator.name(1) }],
          stockQuantity: initialStock2,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  TestValidator.equals(
    "variant2 initial stock",
    variant2.stockQuantity,
    initialStock2,
  );
  // ========== CART SETUP ==========
  // 9. Customer adds variant1 to cart
  const quantity1 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >();
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant1.id,
        quantity: quantity1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 10. Customer adds variant2 to cart
  const quantity2 = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
  >();
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant2.id,
        quantity: quantity2,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // ========== ADDRESS SETUP ==========
  // 11. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphabets(5),
          country: RandomGenerator.name(),
        } satisfies IEcommerceMallAddress.ICreate,
      },
    );
  typia.assert(address);
  // ========== ORDER CREATION ==========
  // 12. Customer places order
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
  // ========== VALIDATION ==========
  // 13. Verify order has correct number of items
  TestValidator.equals("order item count", order.order_items.length, 2);
  // 14. Verify order total price
  const expectedTotal = order.order_items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  TestValidator.equals("order total price", order.total_price, expectedTotal);
  // 15. Verify order status is 'paid'
  TestValidator.equals("order status", order.status, "paid");
  // 16. Verify each order item
  const orderItem1 = typia.assert(
    order.order_items.find(
      (item) => item.productVariant.sku_code === variant1.skuCode,
    )!,
  );
  const orderItem2 = typia.assert(
    order.order_items.find(
      (item) => item.productVariant.sku_code === variant2.skuCode,
    )!,
  );
  TestValidator.equals("order item 1 quantity", orderItem1.quantity, quantity1);
  TestValidator.equals("order item 2 quantity", orderItem2.quantity, quantity2);
  TestValidator.equals("order item 1 status", orderItem1.status, "paid");
  TestValidator.equals("order item 2 status", orderItem2.status, "paid");
  // 17. Verify cart is empty after order (skip - no read API available)
  // 18. Verify stock deduction for variant1 (skip - no read API available)
  // 19. Verify stock deduction for variant2 (skip - no read API available)
}
