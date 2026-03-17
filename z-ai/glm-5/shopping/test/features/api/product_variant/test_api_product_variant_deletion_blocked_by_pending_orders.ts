import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_variants_inventory_adjust } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_adjust";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that variant deletion is blocked when there are pending order items with 'paid' status.
 *
 * This validates critical business logic that prevents sellers from deleting variants
 * that are part of active orders. The test:
 * 1. Creates a seller account and product with a variant
 * 2. Adds inventory to the variant
 * 3. Creates a customer account
 * 4. Customer adds variant to cart and checks out
 * 5. Verifies order item has 'paid' status
 * 6. Attempts to delete the variant as seller
 * 7. Verifies deletion is rejected due to pending orders
 */
export async function test_api_product_variant_deletion_blocked_by_pending_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(1),
    },
  });
  // 2. Create a product with a variant
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {},
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 3. Add inventory so the variant can be ordered
  await generate_random_shopping_mall_seller_variants_inventory_adjust(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity_change: 100,
        reason: "Initial stock for pending order test",
      },
    },
  );
  // 4. Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 5. Add the variant to cart
  await generate_random_shopping_mall_customer_customers_cart_items_create(
    customerConnection,
    {
      body: {
        variantId: variant.id,
        quantity: 1,
      },
    },
  );
  // 6. Checkout to create an order with 'paid' status
  const order = await generate_random_shopping_mall_customer_checkout_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // 7. Verify the order item status is 'paid'
  TestValidator.predicate(
    "order has at least one item",
    order.orderItems.length > 0,
  );
  const orderItem = order.orderItems[0];
  TestValidator.equals("order item status is paid", orderItem.status, "paid");
  // 8. Attempt to delete the variant - should be blocked due to pending orders
  await TestValidator.error(
    "variant deletion blocked by pending orders",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.erase(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
        },
      );
    },
  );
}
