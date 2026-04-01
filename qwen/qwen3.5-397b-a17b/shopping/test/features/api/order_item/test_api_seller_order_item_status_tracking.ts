import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test seller order item status tracking through fulfillment workflow.
 *
 * This test verifies that order item status transitions (paid → shipped → delivered)
 * are correctly reflected when retrieved by the seller. The test sets up a complete
 * order workflow: seller creates product/variant, customer places order, then seller
 * updates order item status through the fulfillment process. Each status transition
 * is validated by retrieving the order item and confirming the status changed while
 * all other snapshotted data (product, variant, seller info) remains unchanged.
 */
export async function test_api_seller_order_item_status_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account with known credentials
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await authorize_seller_join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  // 2. Seller login with same credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Seller creates product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates product variant
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          price_override: null,
          option_value_ids: [],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Setup: Create customer account with known credentials
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await authorize_customer_join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  // 6. Customer login with same credentials
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  // 7. Customer adds variant to cart
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 8. Customer creates order (this sets order item status to 'paid')
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        shopping_mall_address_id: typia.random<string & tags.Format<"uuid">>(),
        cart_item_ids: [cartItem.id],
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the first order item from the order
  const orderItem = order.orderItems[0];
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 9. Seller retrieves order item - verify initial status is 'paid'
  const initialOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(sellerConnection, {
      itemId: orderItem.id,
    });
  typia.assert(initialOrderItem);
  TestValidator.equals(
    "initial status is paid",
    initialOrderItem.status,
    "paid",
  );
  // Store original snapshot data for comparison
  const originalProductId = (initialOrderItem.product as any).id;
  const originalVariantId = (initialOrderItem.productVariant as any).id;
  const originalSellerId = (initialOrderItem.seller as any).id;
  const originalQuantity = initialOrderItem.quantity;
  const originalPrice = initialOrderItem.price;
  // 10. Seller updates order item status to 'shipped'
  const shippedOrderItem =
    await api.functional.shoppingMall.seller.orders.items.update(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          status: "shipped",
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(shippedOrderItem);
  TestValidator.equals(
    "status updated to shipped",
    shippedOrderItem.status,
    "shipped",
  );
  // 11. Seller retrieves order item - verify status is 'shipped'
  const retrievedShippedItem =
    await api.functional.shoppingMall.seller.orders.items.at(sellerConnection, {
      itemId: orderItem.id,
    });
  typia.assert(retrievedShippedItem);
  TestValidator.equals(
    "retrieved status is shipped",
    retrievedShippedItem.status,
    "shipped",
  );
  // Verify snapshot data unchanged
  TestValidator.equals(
    "product unchanged",
    (retrievedShippedItem.product as any).id,
    originalProductId,
  );
  TestValidator.equals(
    "variant unchanged",
    (retrievedShippedItem.productVariant as any).id,
    originalVariantId,
  );
  TestValidator.equals(
    "seller unchanged",
    (retrievedShippedItem.seller as any).id,
    originalSellerId,
  );
  TestValidator.equals(
    "quantity unchanged",
    retrievedShippedItem.quantity,
    originalQuantity,
  );
  TestValidator.equals(
    "price unchanged",
    retrievedShippedItem.price,
    originalPrice,
  );
  // 12. Seller updates order item status to 'delivered'
  const deliveredOrderItem =
    await api.functional.shoppingMall.seller.orders.items.update(
      sellerConnection,
      {
        itemId: orderItem.id,
        body: {
          status: "delivered",
        } satisfies IShoppingMallOrderItem.IUpdate,
      },
    );
  typia.assert(deliveredOrderItem);
  TestValidator.equals(
    "status updated to delivered",
    deliveredOrderItem.status,
    "delivered",
  );
  // 13. Seller retrieves order item - verify final status is 'delivered'
  const finalOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(sellerConnection, {
      itemId: orderItem.id,
    });
  typia.assert(finalOrderItem);
  TestValidator.equals(
    "final status is delivered",
    finalOrderItem.status,
    "delivered",
  );
  // Verify snapshot data still unchanged after final transition
  TestValidator.equals(
    "product still unchanged",
    (finalOrderItem.product as any).id,
    originalProductId,
  );
  TestValidator.equals(
    "variant still unchanged",
    (finalOrderItem.productVariant as any).id,
    originalVariantId,
  );
  TestValidator.equals(
    "seller still unchanged",
    (finalOrderItem.seller as any).id,
    originalSellerId,
  );
  TestValidator.equals(
    "quantity still unchanged",
    finalOrderItem.quantity,
    originalQuantity,
  );
  TestValidator.equals(
    "price still unchanged",
    finalOrderItem.price,
    originalPrice,
  );
}