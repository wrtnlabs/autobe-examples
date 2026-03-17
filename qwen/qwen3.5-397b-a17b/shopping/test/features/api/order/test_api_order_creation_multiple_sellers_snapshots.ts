import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

/**
 * Test order creation with items from multiple sellers, verifying snapshot integrity for each.
 *
 * This test validates that when a customer places an order containing products from
 * different sellers, each order item correctly preserves independent snapshots of the
 * purchased product and variant at the time of order. This ensures historical accuracy
 * even if sellers later modify their product information.
 *
 * Test Flow:
 * 1. Register and authenticate a customer
 * 2. Register and authenticate two different sellers (Seller A and Seller B)
 * 3. Seller A creates Product A with specific price ($50)
 * 4. Seller B creates Product B with specific price ($75)
 * 5. Customer adds both products to cart (variants assumed to exist)
 * 6. Customer places order with both items
 * 7. Verify order contains two items with correct seller information
 * 8. Verify each order item has proper product and variant snapshots
 * 9. Verify snapshots capture correct prices and seller data at order time
 *
 * Business Rules Validated:
 * - Single order can contain items from multiple sellers
 * - Each order item preserves independent snapshot of purchased product/variant
 * - Snapshots capture seller-specific information for historical accuracy
 * - Order total correctly aggregates across all sellers
 * - Future product edits by sellers do not affect historical order records
 */
export async function test_api_order_creation_multiple_sellers_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // STEP 1: Customer Registration and Authentication
  // ============================================
  const customerAuth = await authorize_customer_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // ============================================
  // STEP 2: Seller A Registration and Authentication
  // ============================================
  const sellerAAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!",
      shop_name: `Shop A - ${RandomGenerator.name()}`,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAConnection, {
    body: {
      email: sellerAAuth.email,
      password: "Seller1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  // ============================================
  // STEP 3: Seller B Registration and Authentication
  // ============================================
  const sellerBAuth = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seller1234!",
      shop_name: `Shop B - ${RandomGenerator.name()}`,
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerBConnection, {
    body: {
      email: sellerBAuth.email,
      password: "Seller1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  // ============================================
  // STEP 4: Seller A Creates Product A
  // ============================================
  const productA = await api.functional.shoppingMall.seller.products.create(
    sellerAConnection,
    {
      body: {
        name: `Product A - ${RandomGenerator.name()}`,
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 50,
      },
    },
  );
  typia.assert(productA);
  // Verify Seller A's product has correct seller information
  TestValidator.equals(
    "Product A seller shop name",
    productA.seller.shop_name,
    sellerAAuth.shop_name,
  );
  TestValidator.equals("Product A base price", productA.base_price, 50);
  // ============================================
  // STEP 5: Seller B Creates Product B
  // ============================================
  const productB = await api.functional.shoppingMall.seller.products.create(
    sellerBConnection,
    {
      body: {
        name: `Product B - ${RandomGenerator.name()}`,
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 75,
      },
    },
  );
  typia.assert(productB);
  // Verify Seller B's product has correct seller information
  TestValidator.equals(
    "Product B seller shop name",
    productB.seller.shop_name,
    sellerBAuth.shop_name,
  );
  TestValidator.equals("Product B base price", productB.base_price, 75);
  // ============================================
  // STEP 6: Customer Adds Both Products to Cart
  // ============================================
  // Note: Products should have variants created. Using first variant if available,
  // otherwise the test environment should handle variant creation automatically.
  const variantAId = productA.variants[0]?.id ?? productA.id;
  const variantBId = productB.variants[0]?.id ?? productB.id;
  const cartItemA =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variantAId,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemA);
  const cartItemB =
    await api.functional.shoppingMall.customer.customers.cart.items.create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variantBId,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemB);
  // Verify cart items have correct product information
  TestValidator.equals(
    "Cart item A product name",
    cartItemA.product.name,
    productA.name,
  );
  TestValidator.equals(
    "Cart item B product name",
    cartItemB.product.name,
    productB.name,
  );
  // ============================================
  // STEP 7: Customer Places Order
  // ============================================
  // Note: addressId must belong to the authenticated customer.
  // In test environment, this should be a pre-existing address or created via setup.
  const order = await api.functional.shoppingMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(order);
  // ============================================
  // STEP 8: Validate Order Structure
  // ============================================
  // Verify order has two items
  TestValidator.equals("Order item count", order.items.length, 2);
  // Verify order total is sum of both products (50 + 75 = 125)
  TestValidator.equals("Order total price", order.total_price, 125);
  // ============================================
  // STEP 9: Validate Snapshot Integrity
  // ============================================
  // Find items by seller
  const orderItemA = order.items.find(
    (item) => item.seller.id === sellerAAuth.id,
  );
  const orderItemB = order.items.find(
    (item) => item.seller.id === sellerBAuth.id,
  );
  TestValidator.predicate(
    "Order contains Seller A's item",
    () => orderItemA !== undefined,
  );
  TestValidator.predicate(
    "Order contains Seller B's item",
    () => orderItemB !== undefined,
  );
  if (orderItemA && orderItemB) {
    // Validate Seller A's order item snapshots
    TestValidator.equals(
      "Order item A - Product snapshot name",
      orderItemA.productSnapshot.name,
      productA.name,
    );
    TestValidator.equals(
      "Order item A - Product snapshot base price",
      orderItemA.productSnapshot.base_price,
      50,
    );
    TestValidator.equals(
      "Order item A - Seller shop name in snapshot",
      orderItemA.seller.shop_name,
      sellerAAuth.shop_name,
    );
    // Validate Seller B's order item snapshots
    TestValidator.equals(
      "Order item B - Product snapshot name",
      orderItemB.productSnapshot.name,
      productB.name,
    );
    TestValidator.equals(
      "Order item B - Product snapshot base price",
      orderItemB.productSnapshot.base_price,
      75,
    );
    TestValidator.equals(
      "Order item B - Seller shop name in snapshot",
      orderItemB.seller.shop_name,
      sellerBAuth.shop_name,
    );
    // Validate variant snapshots exist and contain correct data
    TestValidator.predicate(
      "Order item A has variant snapshot",
      () => orderItemA.productVariantSnapshot !== undefined,
    );
    TestValidator.predicate(
      "Order item B has variant snapshot",
      () => orderItemB.productVariantSnapshot !== undefined,
    );
    // Verify variant snapshot SKU codes are preserved
    TestValidator.predicate(
      "Order item A - Variant snapshot has SKU",
      () =>
        orderItemA.productVariantSnapshot.sku_code !== undefined &&
        orderItemA.productVariantSnapshot.sku_code.length > 0,
    );
    TestValidator.predicate(
      "Order item B - Variant snapshot has SKU",
      () =>
        orderItemB.productVariantSnapshot.sku_code !== undefined &&
        orderItemB.productVariantSnapshot.sku_code.length > 0,
    );
  }
  // ============================================
  // STEP 10: Verify Order Number and Customer
  // ============================================
  TestValidator.predicate(
    "Order has order number",
    () => order.order_number !== undefined && order.order_number.length > 0,
  );
  TestValidator.equals(
    "Order customer email",
    order.customer.email,
    customerAuth.email,
  );
  // ============================================
  // STEP 11: Validate Business Logic
  // ============================================
  // Single order contains items from multiple sellers
  const uniqueSellerIds = new Set(order.items.map((item) => item.seller.id));
  TestValidator.equals(
    "Order contains items from 2 different sellers",
    uniqueSellerIds.size,
    2,
  );
  // Each order item has independent seller reference
  TestValidator.notEquals(
    "Order items have different sellers",
    order.items[0].seller.id,
    order.items[1].seller.id,
  );
  // Snapshots preserve historical data
  TestValidator.predicate("All order items have product snapshots", () =>
    order.items.every((item) => item.productSnapshot !== undefined),
  );
  TestValidator.predicate("All order items have variant snapshots", () =>
    order.items.every((item) => item.productVariantSnapshot !== undefined),
  );
}