import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshotProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotProductImage";
import type { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout } from "../../../generate/generate_random_shopping_mall_customer_checkout";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_customer_cart_item } from "../../../prepare/prepare_random_shopping_mall_customer_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

/**
 * Test that order items maintain independent status tracking within a multi-item order from different sellers.
 *
 * Validates the complete order fulfillment flow where items from different sellers are shipped independently. Ensures that each order item maintains its own status lifecycle (paid, shipped, delivered) regardless of other items in the same order.
 *
 * Special attention is given to verifying that shipment creation by one seller only affects their own items, while other sellers' items remain in their original status. This tests the partial order processing capability of the shopping mall platform.
 *
 * 1. Customer registers and authenticates with email and password.
 * 2. Seller A registers, authenticates, creates a product with variants and inventory.
 * 3. Seller B registers, authenticates, creates a product with variants and inventory.
 * 4. Customer adds one variant from Seller A and one from Seller B to cart.
 * 5. Customer completes checkout - order created with two items in 'paid' status.
 * 6. Seller A creates shipment for their item (status changes to 'shipped').
 * 7. Customer queries Seller A's item status - verifies 'shipped'.
 * 8. Customer queries Seller B's item status - verifies still 'paid'.
 * 9. Validates order summary shows mixed item states correctly.
 */
export async function test_api_order_item_status_independent_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller A registration, authentication, and product creation
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuth = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAAuth);
  const productA = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productA);
  // 3. Seller B registration, authentication, and product creation
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuth = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerBAuth);
  const productB = await generate_random_shopping_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(productB);
  // 4. Customer adds both variants to cart
  // Use first available variant from each product, or product ID if no variants
  const variantAId = productA.variants[0]?.id ?? productA.id;
  const variantBId = productB.variants[0]?.id ?? productB.id;
  const cartItemA =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variantAId,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemA);
  const cartItemB =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variantBId,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemB);
  // 5. Customer completes checkout
  const order = await generate_random_shopping_mall_customer_checkout(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        payment_token: RandomGenerator.alphaNumeric(32),
      },
    },
  );
  typia.assert(order);
  // Extract order items by seller
  const itemA = order.items.find((item) => item.seller.id === sellerAAuth.id)!;
  const itemB = order.items.find((item) => item.seller.id === sellerBAuth.id)!;
  TestValidator.predicate(
    "Order contains item from Seller A",
    itemA !== undefined,
  );
  TestValidator.predicate(
    "Order contains item from Seller B",
    itemB !== undefined,
  );
  // 6. Seller A creates shipment for their item
  const shipment = await generate_random_shopping_mall_seller_shipments_create(
    sellerAConnection,
    {
      body: {
        carrier_name: "TestCarrier",
        tracking_number: RandomGenerator.alphaNumeric(20),
        order_item_ids: [itemA.id],
      },
    },
  );
  typia.assert(shipment);
  // 7. Verify Seller A's item status is 'shipped'
  const itemAAfterShipment =
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: itemA.id,
      },
    );
  typia.assert(itemAAfterShipment);
  TestValidator.equals(
    "Seller A item status is shipped",
    itemAAfterShipment.status,
    "shipped",
  );
  // 8. Verify Seller B's item status is still 'paid'
  const itemBAfterShipment =
    await api.functional.shoppingMall.customer.orders.items.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: itemB.id,
      },
    );
  typia.assert(itemBAfterShipment);
  TestValidator.equals(
    "Seller B item status is still paid",
    itemBAfterShipment.status,
    "paid",
  );
  // 9. Validate order summary shows mixed item states
  TestValidator.predicate(
    "Order has items with different statuses",
    itemAAfterShipment.status !== itemBAfterShipment.status,
  );
}
