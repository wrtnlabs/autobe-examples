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
 * Test that customers can filter their cart history by creation date range.
 *
 * This test verifies the date range filtering functionality for cart listings,
 * ensuring that created_at_from and created_at_to filters work correctly
 * to return carts within specified time periods.
 */
export async function test_api_customer_cart_list_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(auth);
  // 2. Add items to cart to create first cart record
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem1);
  const firstCartId = cartItem1.cart.id;
  const firstCartCreatedAt = cartItem1.cart.created_at;
  // 3. Create an order to mark first cart as deleted (carts are marked deleted after checkout)
  const order =
    await generate_random_shopping_mall_customer_orders_create(
      customerConnection,
      {},
    );
  typia.assert(order);
  // 4. Add new items to cart to create second cart record with different timestamp
  // Wait a small delay to ensure different timestamp
  await new Promise((resolve) => setTimeout(resolve, 100));
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem2);
  const secondCartId = cartItem2.cart.id;
  const secondCartCreatedAt = cartItem2.cart.created_at;
  // 5. Retrieve cart list with created_at_from filter set after first cart's creation
  // This should only return the second cart
  const filteredFromResult =
    await api.functional.shoppingMall.customer.cart.index(customerConnection, {
      body: {
        created_at_from: secondCartCreatedAt,
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(filteredFromResult);
  // 6. Verify only second cart is returned with created_at_from filter
  TestValidator.predicate(
    "created_at_from filter returns only carts on or after filter date",
    () =>
      filteredFromResult.data.every(
        (cart) => cart.created_at >= secondCartCreatedAt,
      ),
  );
  TestValidator.predicate(
    "created_at_from filter excludes first cart",
    () =>
      !filteredFromResult.data.some(
        (cart) => cart.created_at < secondCartCreatedAt,
      ),
  );
  // 7. Retrieve cart list with created_at_to filter set before second cart's creation
  // This should only return the first cart
  const filteredToResult =
    await api.functional.shoppingMall.customer.cart.index(customerConnection, {
      body: {
        created_at_to: firstCartCreatedAt,
      } satisfies IShoppingMallCart.IRequest,
    });
  typia.assert(filteredToResult);
  // 8. Verify only first cart is returned with created_at_to filter
  TestValidator.predicate(
    "created_at_to filter returns only carts on or before filter date",
    () =>
      filteredToResult.data.every(
        (cart) => cart.created_at <= firstCartCreatedAt,
      ),
  );
  // 9. Test combined date range filtering
  const dateRangeResult = await api.functional.shoppingMall.customer.cart.index(
    customerConnection,
    {
      body: {
        created_at_from: firstCartCreatedAt,
        created_at_to: secondCartCreatedAt,
      } satisfies IShoppingMallCart.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // 10. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    () => dateRangeResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    () => dateRangeResult.pagination.records === dateRangeResult.data.length,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    () =>
      dateRangeResult.pagination.pages ===
      Math.ceil(
        dateRangeResult.pagination.records / dateRangeResult.pagination.limit,
      ),
  );
  // Verify all carts in date range result fall within the filter range
  TestValidator.predicate(
    "date range filter returns carts within specified range",
    () =>
      dateRangeResult.data.every(
        (cart) =>
          cart.created_at >= firstCartCreatedAt &&
          cart.created_at <= secondCartCreatedAt,
      ),
  );
}