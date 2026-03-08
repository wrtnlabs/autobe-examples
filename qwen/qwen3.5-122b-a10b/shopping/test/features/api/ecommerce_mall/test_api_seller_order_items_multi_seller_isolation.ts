import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that sellers can only view order items for their own products in multi-seller orders.
 *
 * This test validates data isolation in a multi-seller e-commerce platform where:
 * 1. Two different sellers create products and variants
 * 2. A customer places a single order containing items from both sellers
 * 3. Each seller can only see their own order items when querying the order items endpoint
 * 4. Order item data isolation is properly enforced at the API level
 */
export async function test_api_seller_order_items_multi_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A and authenticate
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Seller A Shop ${RandomGenerator.alphabets(4)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  // 2. Create Seller B and authenticate
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Seller B Shop ${RandomGenerator.alphabets(4)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  // 3. Create a category for products (we need a valid category_id)
  // Since we don't have admin category creation in this test, we'll use typia.random for category_id
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Seller A creates Product A
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: `Product A ${RandomGenerator.alphabets(4)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  // 5. Seller A creates Variant A for Product A
  const variantA =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          skuCode: `SKU-A-${RandomGenerator.alphaNumeric(8)}`,
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
  typia.assert(variantA);
  // 6. Seller B creates Product B
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: `Product B ${RandomGenerator.alphabets(4)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 7. Seller B creates Variant B for Product B
  const variantB =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          skuCode: `SKU-B-${RandomGenerator.alphaNumeric(8)}`,
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
  typia.assert(variantB);
  // 8. Create Customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 9. Customer adds Variant A to cart
  const cartItemA =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantA.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemA);
  // 10. Customer adds Variant B to cart
  const cartItemB =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantB.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemB);
  // 11. Customer places order with items from both sellers
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: `${RandomGenerator.alphabets(10)} Street`,
        shipping_city: "Seoul",
        shipping_state: "Seoul",
        shipping_postal_code: "04524",
        shipping_country: "South Korea",
      },
    },
  );
  typia.assert(order);
  // Verify order contains both items
  TestValidator.equals("order has 2 items", order.order_items.length, 2);
  TestValidator.equals(
    "order number is consistent",
    order.order_items[0].order.orderNumber,
    order.order_items[1].order.orderNumber,
  );
  // 12. Seller A queries order items - should see ONLY Variant A's order item
  const sellerAOrderItems =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerAConnection,
      {
        body: {
          limit: 100,
          page: 1,
        },
      },
    );
  typia.assert(sellerAOrderItems);
  // 13. Seller B queries order items - should see ONLY Variant B's order item
  const sellerBOrderItems =
    await api.functional.ecommerceMall.seller.order_items.index(
      sellerBConnection,
      {
        body: {
          limit: 100,
          page: 1,
        },
      },
    );
  typia.assert(sellerBOrderItems);
  // 14. Validate data isolation
  TestValidator.equals(
    "Seller A sees only 1 order item",
    sellerAOrderItems.data.length,
    1,
  );
  TestValidator.equals(
    "Seller B sees only 1 order item",
    sellerBOrderItems.data.length,
    1,
  );
  // 15. Validate Seller A's order item is for Variant A
  const sellerAItem = sellerAOrderItems.data[0];
  TestValidator.equals(
    "Seller A's order item variant ID matches Variant A",
    sellerAItem.productVariant.id,
    variantA.id,
  );
  TestValidator.equals(
    "Seller A's order item SKU matches Variant A SKU",
    sellerAItem.productVariant.sku_code,
    variantA.skuCode,
  );
  // 16. Validate Seller B's order item is for Variant B
  const sellerBItem = sellerBOrderItems.data[0];
  TestValidator.equals(
    "Seller B's order item variant ID matches Variant B",
    sellerBItem.productVariant.id,
    variantB.id,
  );
  TestValidator.equals(
    "Seller B's order item SKU matches Variant B SKU",
    sellerBItem.productVariant.sku_code,
    variantB.skuCode,
  );
  // 17. Validate neither seller can see the other's order item
  TestValidator.notEquals(
    "Seller A cannot see Seller B's variant",
    sellerAItem.productVariant.id,
    variantB.id,
  );
  TestValidator.notEquals(
    "Seller B cannot see Seller A's variant",
    sellerBItem.productVariant.id,
    variantA.id,
  );
  // 18. Validate both order items belong to the same parent order
  TestValidator.equals(
    "Both order items share the same order number",
    sellerAItem.order.orderNumber,
    sellerBItem.order.orderNumber,
  );
  // 19. Validate order item status is 'paid'
  TestValidator.equals(
    "Seller A's order item status is paid",
    sellerAItem.status,
    "paid",
  );
  TestValidator.equals(
    "Seller B's order item status is paid",
    sellerBItem.status,
    "paid",
  );
}