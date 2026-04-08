import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test order retrieval with complete details including order items, snapshots, and shipments.
 *
 * Validates the complete order retrieval flow including member authentication, seller product setup, cart operations, order placement, and comprehensive order detail validation. Ensures that the order response contains all required metadata, order items with snapshot data preserving purchase-time state, and shipment information.
 *
 * Special attention is given to verifying that order item snapshots capture immutable product information (name, description, variant price, seller shop details) and option key-value pairs at the time of purchase. The test also validates that the total price calculation is accurate and matches the sum of all order item prices multiplied by quantities.
 *
 * 1. Member registers and authenticates via join operation.
 * 2. Seller registers and authenticates to create product.
 * 3. Seller creates product with name, description, category, and base price.
 * 4. Seller creates product variant with SKU code and option values.
 * 5. Member adds variant to shopping cart.
 * 6. Member places order by checking out cart.
 * 7. Member retrieves complete order details by order ID.
 * 8. Validates order metadata, order items, snapshots, options, and shipments.
 */
export async function test_api_order_retrieval_with_complete_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Seller creates product with category reference
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant with options
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Member adds variant to cart
  const cartItem = await generate_random_shopping_mall_member_cart_items_create(
    memberConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 6. Member places order
  const order = await generate_random_shopping_mall_member_orders_create(
    memberConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 7. Retrieve complete order details
  const retrievedOrder = await api.functional.shoppingMall.member.orders.at(
    memberConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(retrievedOrder);
  // 8. Validate order metadata
  TestValidator.equals("order ID matches", retrievedOrder.id, order.id);
  TestValidator.predicate(
    "order code is non-empty string",
    retrievedOrder.code.length > 0,
  );
  TestValidator.predicate(
    "total price is positive",
    retrievedOrder.total_price > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    retrievedOrder.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    retrievedOrder.updated_at.length > 0,
  );
  // 9. Validate customer matches authenticated member
  TestValidator.equals(
    "customer ID matches member",
    retrievedOrder.customer.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "customer email matches member",
    retrievedOrder.customer.email,
    memberAuth.email,
  );
  // 10. Validate order items exist and contain correct data
  TestValidator.predicate(
    "order has at least one item",
    retrievedOrder.orderItems.length >= 1,
  );
  const orderItem = retrievedOrder.orderItems[0];
  TestValidator.equals(
    "order item quantity matches cart",
    orderItem.quantity,
    cartItem.quantity,
  );
  TestValidator.predicate("order item price is positive", orderItem.price > 0);
  // 11. Validate order item snapshot data
  TestValidator.equals(
    "snapshot product name matches",
    orderItem.snapshot.product_name,
    product.name,
  );
  TestValidator.equals(
    "snapshot product description matches",
    orderItem.snapshot.product_description,
    product.description,
  );
  TestValidator.predicate(
    "snapshot variant price is positive",
    orderItem.snapshot.variant_price > 0,
  );
  TestValidator.predicate(
    "snapshot seller shop name exists",
    orderItem.snapshot.seller_shop_name.length > 0,
  );
  // 12. Validate snapshot options array exists
  TestValidator.predicate(
    "snapshot options array exists",
    Array.isArray(orderItem.snapshot.options),
  );
  // 13. Validate shipments array exists
  TestValidator.predicate(
    "shipments array exists",
    Array.isArray(retrievedOrder.shipments),
  );
  // 14. Validate total price calculation
  const calculatedTotal = retrievedOrder.orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  TestValidator.equals(
    "total price matches sum of items",
    retrievedOrder.total_price,
    calculatedTotal,
  );
}
