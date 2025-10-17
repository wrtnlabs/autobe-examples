import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

export async function test_api_get_shopping_cart_details_by_customer(
  connection: api.IConnection,
) {
  // Step 1: Customer authentication and registration
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallCustomer.IJoin;

  const joinResult: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinBody });
  typia.assert(joinResult);

  // Step 2: Create customer for shopping cart ownership
  const createBody = {
    email: joinBody.email,
    password_hash: joinResult.password_hash,
    status: "active",
    nickname: joinResult.nickname ?? null,
    phone_number: joinResult.phone_number ?? null,
  } satisfies IShoppingMallCustomer.ICreate;

  const createdCustomer: IShoppingMallCustomer =
    await api.functional.shoppingMall.customers.create(connection, {
      body: createBody,
    });
  typia.assert(createdCustomer);

  // Step 3: Create shopping cart
  const cartCreateBody = {
    shopping_mall_customer_id: createdCustomer.id,
    session_id: null,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const createdCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      { body: cartCreateBody },
    );
  typia.assert(createdCart);

  // Step 4: Retrieve the cart details by shoppingCartId
  const retrievedCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.at(connection, {
      shoppingCartId: createdCart.id,
    });
  typia.assert(retrievedCart);

  // Step 5: Verify that the created cart and retrieved cart are consistent
  TestValidator.equals(
    "shopping cart id matches",
    retrievedCart.id,
    createdCart.id,
  );
  TestValidator.equals(
    "shopping cart customer id matches",
    retrievedCart.shopping_mall_customer_id,
    createdCart.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "shopping cart session id matches",
    retrievedCart.session_id,
    createdCart.session_id,
  );
}
