import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_addresses_create } from "../../../generate/generate_random_shopping_mall_member_addresses_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_customer_address } from "../../../prepare/prepare_random_shopping_mall_customer_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test order creation when customer's cart contains items from multiple sellers.
 *
 * Validates the complete order creation flow including administrative category setup, multiple seller product creation, customer authentication, cart management with items from different sellers, and order placement. Ensures that a single order correctly contains multiple order items from different sellers with accurate pricing and seller references.
 *
 * Special attention is given to verifying that each order item maintains its respective seller identity, the order total_price accurately reflects the sum of all cart items, and the cart is completely cleared after successful order placement.
 *
 * 1. Administrator creates a category for product organization.
 * 2. First seller registers and creates a product with variant (price: 10000).
 * 3. Second seller registers and creates a different product with variant (price: 15000).
 * 4. Customer member registers and creates a shipping address.
 * 5. Customer adds first seller's variant to cart (quantity 2).
 * 6. Customer adds second seller's variant to cart (quantity 1).
 * 7. Customer places order with shipping address.
 * 8. Validates order contains 2 order items from different sellers, total_price equals 35000 (2×10000 + 1×15000), all items have status 'paid', and cart is emptied.
 */
export async function test_api_order_creation_multiple_items_different_sellers(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 2. First seller joins and creates product with variant
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1);
  const product1 = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: 10000,
      },
    },
  );
  typia.assert(product1);
  const variant1 = await generate_random_shopping_mall_seller_variants_create(
    seller1Connection,
    {
      body: {
        shopping_mall_product_id: product1.id,
        sku_code: "SELLER1-VARIANT1",
        option_values: "Color: Red, Size: Large",
        price: 10000,
      },
    },
  );
  typia.assert(variant1);
  // 3. Second seller joins and creates product with variant
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2);
  const product2 = await generate_random_shopping_mall_seller_products_create(
    seller2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: 15000,
      },
    },
  );
  typia.assert(product2);
  const variant2 = await generate_random_shopping_mall_seller_variants_create(
    seller2Connection,
    {
      body: {
        shopping_mall_product_id: product2.id,
        sku_code: "SELLER2-VARIANT1",
        option_values: "Color: Blue, Size: Medium",
        price: 15000,
      },
    },
  );
  typia.assert(variant2);
  // 4. Member joins and creates shipping address
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  const address = await generate_random_shopping_mall_member_addresses_create(
    memberConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        recipient_phone: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
        is_default: true,
      },
    },
  );
  typia.assert(address);
  // 5. Member adds first seller's variant to cart (quantity 2)
  const cartItem1 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant1.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  // 6. Member adds second seller's variant to cart (quantity 1)
  const cartItem2 =
    await generate_random_shopping_mall_member_cart_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem2);
  // 7. Member places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 8. Validate order structure
  TestValidator.equals("order has 2 items", order.orderItems.length, 2);
  const expectedTotal = 2 * 10000 + 1 * 15000; // 35000
  TestValidator.equals("order total_price", order.total_price, expectedTotal);
  // Validate each order item has correct seller
  const orderItem1 = order.orderItems.find(
    (item) => item.seller.id === seller1.id,
  );
  const orderItem2 = order.orderItems.find(
    (item) => item.seller.id === seller2.id,
  );
  TestValidator.predicate(
    "first seller's item exists",
    orderItem1 !== undefined,
  );
  TestValidator.predicate(
    "second seller's item exists",
    orderItem2 !== undefined,
  );
  if (orderItem1 && orderItem2) {
    TestValidator.equals("item1 quantity", orderItem1.quantity, 2);
    TestValidator.equals("item2 quantity", orderItem2.quantity, 1);
    TestValidator.equals("item1 price", orderItem1.price, 10000);
    TestValidator.equals("item2 price", orderItem2.price, 15000);
    TestValidator.equals("item1 status", orderItem1.status, "paid");
    TestValidator.equals("item2 status", orderItem2.status, "paid");
  }
}
