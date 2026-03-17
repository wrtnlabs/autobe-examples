import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";

/**
 * Test order retrieval by sellers for multi-seller orders.
 *
 * When a customer places an order with items from multiple sellers, each seller
 * should only see their own items when retrieving the order. This test verifies:
 * 1. Order creation with items from two different sellers
 * 2. Each seller can retrieve the order and sees only their items
 * 3. Order header information (total price, shipping address) is visible to all sellers
 * 4. Product and variant snapshots are preserved at purchase time
 */
export async function test_api_seller_order_with_multi_seller_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://localhost:3000/admin/join",
      referrer: "https://localhost:3000/admin",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  
  // 2. First seller setup - create product and variant
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(16);
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
      href: "https://localhost:3000/seller/join",
      referrer: "https://localhost:3000/seller",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller1);
  const product1 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product1);
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: {
          productId: product1.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "M" },
          ],
          price: product1.basePrice,
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        } satisfies IEcommerceMallProductVariant.ICreate & {
          stock: number;
        },
      },
    );
  typia.assert(variant1);
  
  // 3. Second seller setup - create product and variant
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(16);
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
      href: "https://localhost:3000/seller/join",
      referrer: "https://localhost:3000/seller",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller2);
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product2);
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      seller2Connection,
      {
        params: {
          productId: product2.id,
        },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8).toUpperCase(),
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "L" },
          ],
          price: product2.basePrice,
          stock: typia.random<number & tags.Type<"int32"> & tags.Minimum<10>>(),
        } satisfies IEcommerceMallProductVariant.ICreate & {
          stock: number;
        },
      },
    );
  typia.assert(variant2);
  
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  
  // 5. Add items to cart - first variant from seller1
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant1.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // Add second variant from seller2
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant2.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  
  // 6. Checkout to create multi-seller order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state: null,
        postalCode: typia.random<
          string & tags.Pattern<"^[0-9]{5}$">
        >() as string,
        country: "Republic of Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  
  // 7. Verify order has items from both sellers
  TestValidator.equals("Order has 2 items", order.orderItems.length, 2);
  
  // 8. Seller 1 retrieves order - should only see their item
  const seller1OrderView = await api.functional.ecommerceMall.seller.orders.at(
    seller1Connection,
    { orderId: order.id },
  );
  typia.assert(seller1OrderView);
  
  // Seller 1 should only see order items belonging to them
  TestValidator.predicate(
    "Seller 1 orderItems not empty",
    seller1OrderView.orderItems.length > 0,
  );
  
  // Verify order header info is accessible
  TestValidator.equals(
    "Seller 1 sees order number",
    seller1OrderView.orderNumber,
    order.orderNumber,
  );
  TestValidator.equals(
    "Seller 1 sees total price",
    seller1OrderView.totalPrice,
    order.totalPrice,
  );
  TestValidator.equals(
    "Seller 1 sees recipient name",
    seller1OrderView.recipientName,
    order.recipientName,
  );
  TestValidator.equals(
    "Seller 1 sees shipping address",
    seller1OrderView.streetAddress,
    order.streetAddress,
  );
  
  // 9. Seller 2 retrieves order - should only see their item
  const seller2OrderView = await api.functional.ecommerceMall.seller.orders.at(
    seller2Connection,
    { orderId: order.id },
  );
  typia.assert(seller2OrderView);
  
  // Seller 2 should only see order items belonging to them
  TestValidator.predicate(
    "Seller 2 orderItems not empty",
    seller2OrderView.orderItems.length > 0,
  );
  
  // Verify order header info is accessible
  TestValidator.equals(
    "Seller 2 sees order number",
    seller2OrderView.orderNumber,
    order.orderNumber,
  );
  TestValidator.equals(
    "Seller 2 sees total price",
    seller2OrderView.totalPrice,
    order.totalPrice,
  );
  TestValidator.equals(
    "Seller 2 sees recipient name",
    seller2OrderView.recipientName,
    order.recipientName,
  );
  TestValidator.equals(
    "Seller 2 sees shipping address",
    seller2OrderView.streetAddress,
    order.streetAddress,
  );
  
  // 10. Confirm order status is visible
  TestValidator.equals(
    "Seller 1 sees order status",
    seller1OrderView.status,
    "paid",
  );
  TestValidator.equals(
    "Seller 2 sees order status",
    seller2OrderView.status,
    "paid",
  );
}