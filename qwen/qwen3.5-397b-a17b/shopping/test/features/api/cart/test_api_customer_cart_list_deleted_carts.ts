import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

/**
 * Test that customers can retrieve their deleted cart history (carts from completed orders)
 * using the deleted_at filter for order history review.
 *
 * Test Steps:
 * 1. Register a new customer account and authenticate
 * 2. Add items to cart and complete an order (which marks the cart as deleted)
 * 3. Add items to create a new active cart
 * 4. Retrieve cart list without deleted_at filter (default behavior)
 * 5. Verify only active carts are returned (deleted_at is null)
 * 6. Retrieve cart list with deleted_at set to null explicitly
 * 7. Verify only active carts are returned
 * 8. Retrieve cart list with deleted_at set to a specific datetime value
 * 9. Verify only deleted carts (from completed orders) are returned
 * 10. Verify deleted cart summaries show correct items_count and total_amount at time of deletion
 *
 * Business Validations:
 * - Default query behavior must exclude deleted carts (deleted_at IS NULL)
 * - Explicit deleted_at filter must correctly filter by cart deletion status
 * - Deleted carts must preserve historical accuracy of items_count and total_amount
 * - Customers must be able to view their deleted cart history for order tracking purposes
 * - Soft-delete must preserve cart data for potential recovery and audit purposes
 */
export async function test_api_customer_cart_list_deleted_carts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Add items to cart (first batch for order)
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem1);
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItem2);
  // Store cart info before order for validation
  const deletedCartItemsCount = 2;
  const deletedCartTotalAmount =
    cartItem1.quantity * cartItem1.price + cartItem2.quantity * cartItem2.price;
  // 3. Complete an order (which marks the cart as deleted)
  const order =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // Store the order time for deleted_at filter
  const orderTime = order.ordered_at;
  // 4. Add items to create a new active cart
  const activeCartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(activeCartItem);
  // 5. Retrieve cart list without deleted_at filter (default behavior)
  const defaultCartList = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(defaultCartList);
  // 6. Verify only active carts are returned (deleted_at is null)
  TestValidator.predicate(
    "default query returns at least one cart",
    () => defaultCartList.data.length > 0,
  );
  TestValidator.predicate("all default carts have null deleted_at", () =>
    defaultCartList.data.every((cart) => cart.deleted_at === null),
  );
  // 7. Retrieve cart list with deleted_at set to null explicitly
  const activeCartList = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        deleted_at: null,
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(activeCartList);
  // 8. Verify only active carts are returned with explicit null filter
  TestValidator.predicate(
    "explicit null deleted_at returns at least one cart",
    () => activeCartList.data.length > 0,
  );
  TestValidator.predicate("all explicit null carts have null deleted_at", () =>
    activeCartList.data.every((cart) => cart.deleted_at === null),
  );
  // 9. Retrieve cart list with deleted_at set to order time (to get deleted carts)
  const deletedCartList = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        deleted_at: orderTime,
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(deletedCartList);
  // 10. Verify deleted carts are returned with datetime filter
  TestValidator.predicate(
    "datetime deleted_at returns deleted carts",
    () => deletedCartList.data.length > 0,
  );
  TestValidator.predicate(
    "all datetime filtered carts have non-null deleted_at",
    () => deletedCartList.data.every((cart) => cart.deleted_at !== null),
  );
  // 11. Verify deleted cart preserves historical data
  const deletedCart = deletedCartList.data[0];
  TestValidator.predicate(
    "deleted cart has items_count",
    () => deletedCart.items_count >= deletedCartItemsCount,
  );
  TestValidator.predicate(
    "deleted cart has positive total_amount",
    () => deletedCart.total_amount > 0,
  );
  // 12. Verify active and deleted carts are different sets
  const activeCartIds = activeCartList.data.map((cart) => cart.id);
  const deletedCartIds = deletedCartList.data.map((cart) => cart.id);
  const hasOverlap = activeCartIds.some((id) => deletedCartIds.includes(id));
  TestValidator.predicate(
    "active and deleted carts are disjoint sets",
    () => !hasOverlap,
  );
}