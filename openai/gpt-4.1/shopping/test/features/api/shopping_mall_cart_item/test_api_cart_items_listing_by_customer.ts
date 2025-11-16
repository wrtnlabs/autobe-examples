import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";

/**
 * Validate that authenticated customer can list all items in their shopping
 * cart (which should be empty after creation)
 *
 * 1. Register a new customer (join)
 * 2. Create a new cart for the customer
 * 3. List items from the just-created (empty) cart with only default pagination
 *    parameters
 * 4. Validate that the returned data is an empty array and the pagination reflects
 *    zero records
 */
export async function test_api_cart_items_listing_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer and authenticate
  const newCustomer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(newCustomer);

  // 2. Create a new cart for the customer
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {} satisfies IShoppingMallCart.ICreate,
    },
  );
  typia.assert(cart);

  // 3. List items from the created cart (expecting empty list initially), use required pagination fields
  const reqBody = {
    page: 1 satisfies number,
    limit: 20 satisfies number,
  } satisfies IShoppingMallCartItem.IRequest;

  const result = await api.functional.shoppingMall.customer.carts.items.index(
    connection,
    {
      cartId: cart.id,
      body: reqBody,
    },
  );
  typia.assert(result);

  // 4. Validate response: data is empty, pagination matches zero records
  TestValidator.equals(
    "empty cart returns empty array of items",
    result.data,
    [],
  );
  TestValidator.equals(
    "empty cart shows 0 total records in pagination",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty cart has total 0 pages",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination reflects requested page",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination reflects requested limit",
    result.pagination.limit,
    20,
  );
}
