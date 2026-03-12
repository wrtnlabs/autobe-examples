import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
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
import { generate_random_shopping_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_shopping_mall_customer_customers_me_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that a seller can only view order items containing their own products and cannot access order items from other sellers.
 *
 * This test validates the data isolation business rule that sellers can only view order items for their own products,
 * preventing unauthorized access to competitor order information.
 */
export async function test_api_order_item_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A connection and register
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerA);
  // 2. Create Seller B connection and register
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerB);
  // 3. Create Customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create an order with multiple items from different sellers
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 5. Validate that order has at least 2 items from different sellers
  TestValidator.predicate(
    "order has at least 2 items",
    order.orderItems.length >= 2,
  );
  // 6. Get the first two order items (assumed to be from different sellers)
  const firstItemId = order.orderItems[0].id;
  const secondItemId = order.orderItems[1].id;
  const firstSellerId = order.orderItems[0].sellerId;
  const secondSellerId = order.orderItems[1].sellerId;
  // 7. Validate that the two items are from different sellers
  TestValidator.notEquals(
    "order items are from different sellers",
    firstSellerId,
    secondSellerId,
  );
  // 8. Login as Seller A (who owns the first order item)
  const sellerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerALoginConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 9. As Seller A, retrieve their own order item (should succeed)
  const sellerAOrderItem =
    await api.functional.shoppingMall.seller.orders.items.at(
      sellerALoginConnection,
      {
        itemId: firstItemId,
      },
    );
  typia.assert(sellerAOrderItem);
  // 10. Validate that Seller A can access their own order item
  TestValidator.equals(
    "Seller A can access their own order item",
    sellerAOrderItem.sellerId,
    firstSellerId,
  );
  // 11. As Seller A, attempt to retrieve the second order item (should fail with 403)
  await TestValidator.httpError(
    "Seller A cannot access another seller's order item",
    403,
    async () => {
      await api.functional.shoppingMall.seller.orders.items.at(
        sellerALoginConnection,
        {
          itemId: secondItemId,
        },
      );
    },
  );
}
