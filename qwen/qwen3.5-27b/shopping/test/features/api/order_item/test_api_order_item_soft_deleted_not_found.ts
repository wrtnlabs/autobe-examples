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
 * Test that soft-deleted order items are not accessible through the API.
 *
 * This test validates that order items that are soft-deleted or do not exist
 * return 404 Not Found when accessed. The test:
 * 1. Registers and authenticates a seller
 * 2. Registers and authenticates a customer
 * 3. Creates an order with order items
 * 4. Attempts to retrieve a non-existent order item (simulating soft-deleted)
 * 5. Verifies the API returns 404 Not Found
 *
 * This ensures data integrity and prevents access to logically removed order items.
 */
export async function test_api_order_item_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 3. Create an order with order items
  const order =
    await generate_random_shopping_mall_customer_customers_me_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Verify order has items
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 4. Attempt to retrieve a non-existent order item (simulating soft-deleted)
  const nonExistentItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent order item returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.seller.orders.items.at(
        sellerConnection,
        {
          itemId: nonExistentItemId,
        },
      ),
  );
  // 5. Additional test: Try to access with customer connection as well
  // Customers should also get 404 for non-existent items
  await TestValidator.httpError(
    "non-existent order item returns 404 for customer",
    404,
    async () =>
      await api.functional.shoppingMall.seller.orders.items.at(
        customerConnection,
        {
          itemId: nonExistentItemId,
        },
      ),
  );
}
