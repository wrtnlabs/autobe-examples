import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

export async function test_api_shopping_cart_list_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer joins and authenticates
  const joinBody1 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer1: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody1 });
  typia.assert(customer1);

  // 2. Create multiple shopping carts for this authenticated customer
  const shoppingCarts: IShoppingMallShoppingCart[] = [];
  for (let i = 0; i < 3; i++) {
    const createBody = {
      shopping_mall_customer_id: customer1.id,
      session_id: null,
    } satisfies IShoppingMallShoppingCart.ICreate;
    const cart =
      await api.functional.shoppingMall.customer.shoppingCarts.create(
        connection,
        { body: createBody },
      );
    typia.assert(cart);
    shoppingCarts.push(cart);
  }

  // 3. Retrieve the shopping cart list filtered by the authenticated customer
  const indexBody = {
    shopping_mall_customer_id: customer1.id,
    page: 1,
    limit: 10,
    sort: "created_at desc",
  } satisfies IShoppingMallShoppingCart.IRequest;
  const pageResult: IPageIShoppingMallShoppingCart.ISummary =
    await api.functional.shoppingMall.customer.shoppingCarts.index(connection, {
      body: indexBody,
    });
  typia.assert(pageResult);

  // 4. Validate that all returned carts belong to the authenticated customer
  for (const cart of pageResult.data) {
    TestValidator.predicate(
      "cart belongs to the authenticated customer",
      cart.shopping_mall_customer_id === customer1.id,
    );
  }

  // 5. Validate that created carts appear in the listing
  for (const createdCart of shoppingCarts) {
    const found = pageResult.data.find((cart) => cart.id === createdCart.id);
    TestValidator.predicate(
      `created cart ${createdCart.id} appears in listing`,
      found !== undefined,
    );
    if (found) {
      TestValidator.equals(
        `created cart ${createdCart.id} matches authenticated customer`,
        found.shopping_mall_customer_id,
        customer1.id,
      );
    }
  }

  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    pageResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit of at least number of created carts",
    pageResult.pagination.limit >= shoppingCarts.length,
  );

  // 7. Create a second customer to verify isolation
  const joinBody2 = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer2: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody2 });
  typia.assert(customer2);

  // 8. Create shopping carts for second customer
  const createBody2 = {
    shopping_mall_customer_id: customer2.id,
    session_id: null,
  } satisfies IShoppingMallShoppingCart.ICreate;
  const cart2 = await api.functional.shoppingMall.customer.shoppingCarts.create(
    connection,
    { body: createBody2 },
  );
  typia.assert(cart2);

  // 9. Retrieve listing for second customer
  const indexBody2 = {
    shopping_mall_customer_id: customer2.id,
    page: 1,
    limit: 10,
    sort: "created_at desc",
  } satisfies IShoppingMallShoppingCart.IRequest;
  const pageResult2: IPageIShoppingMallShoppingCart.ISummary =
    await api.functional.shoppingMall.customer.shoppingCarts.index(connection, {
      body: indexBody2,
    });
  typia.assert(pageResult2);

  // 10. Validate that returned carts belong only to second customer
  for (const cart of pageResult2.data) {
    TestValidator.predicate(
      "cart belongs to the second authenticated customer",
      cart.shopping_mall_customer_id === customer2.id,
    );
  }

  // 11. Validate no carts from first customer appear in second customer's listing
  for (const createdCart of shoppingCarts) {
    const found = pageResult2.data.find((cart) => cart.id === createdCart.id);
    TestValidator.predicate(
      `first customer's cart ${createdCart.id} does not appear in second customer's listing`,
      found === undefined,
    );
  }
}
