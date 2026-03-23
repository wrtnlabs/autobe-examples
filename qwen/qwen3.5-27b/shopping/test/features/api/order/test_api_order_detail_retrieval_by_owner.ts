import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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
import { generate_random_shopping_mall_customer_customers_me_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_cart_items_create";
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_detail_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test order detail retrieval by owner.
   * Verifies that authenticated customers can retrieve complete order details
   * including order items with product/variant/seller snapshots.
   */
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Add items to customer cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_customers_me_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  // 4. Create order from cart
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Retrieve order details
  const retrievedOrder = await api.functional.shoppingMall.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(retrievedOrder);
  // 6. Validate order header information
  TestValidator.equals("order id matches", retrievedOrder.id, order.id);
  TestValidator.equals(
    "total price matches",
    retrievedOrder.total_price,
    order.total_price,
  );
  TestValidator.predicate("has valid status", retrievedOrder.status !== "");
  TestValidator.predicate(
    "has created_at timestamp",
    retrievedOrder.created_at !== "",
  );
  TestValidator.predicate(
    "has shipping address snapshot",
    retrievedOrder.shipping_address_snapshot !== "",
  );
  // 7. Validate customer information
  TestValidator.equals(
    "customer email matches",
    retrievedOrder.customer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "customer display name matches",
    retrievedOrder.customer.display_name,
    customerAuth.display_name,
  );
  // 8. Validate order items
  TestValidator.predicate(
    "has order items",
    retrievedOrder.orderItems.length > 0,
  );
  await ArrayUtil.asyncForEach(retrievedOrder.orderItems, async (item) => {
    typia.assert(item);
    TestValidator.predicate("item has valid id", item.id !== "");
    TestValidator.predicate("item has valid order id", item.orderId !== "");
    TestValidator.predicate("item has valid seller id", item.sellerId !== "");
    TestValidator.predicate("item has positive quantity", item.quantity > 0);
    TestValidator.predicate("item has positive price", item.price > 0);
    TestValidator.predicate("item has valid status", item.status !== "");
    TestValidator.predicate(
      "item has product snapshot",
      item.productSnapshot !== "",
    );
    TestValidator.predicate(
      "item has variant snapshot",
      item.variantSnapshot !== "",
    );
    TestValidator.predicate(
      "item has seller profile snapshot",
      item.sellerProfileSnapshot !== "",
    );
    TestValidator.predicate(
      "item has seller summary",
      item.seller.shop_name !== "",
    );
  });
  // 9. Verify data isolation - customer can only access their own orders
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomerAuth = await authorize_customer_join(
    otherCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(otherCustomerAuth);
  await TestValidator.httpError(
    "cannot access other customer's order",
    404,
    async () =>
      await api.functional.shoppingMall.customer.orders.at(
        otherCustomerConnection,
        {
          orderId: order.id,
        },
      ),
  );
}