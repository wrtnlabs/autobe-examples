import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

/**
 * Validate updating a shopping cart by its ID by the authenticated customer.
 *
 * Workflow:
 *
 * 1. Register (join) a new customer user account through /auth/customer/join to
 *    obtain authorization.
 * 2. Create a new shopping cart linked to the authenticated customer.
 * 3. Update the shopping cart's session_id and shopping_mall_customer_id fields.
 * 4. Validate the update is persisted and correct.
 * 5. Attempt an unauthorized update (using an unauthenticated connection) and
 *    expect failure.
 */
export async function test_api_shopping_cart_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd123!",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(customer);

  // 2. Create shopping cart linked to customer
  const cartCreateBody = {
    shopping_mall_customer_id: customer.id,
    session_id: null,
  } satisfies IShoppingMallShoppingCart.ICreate;

  const cart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.create(
      connection,
      {
        body: cartCreateBody,
      },
    );
  typia.assert(cart);

  // 3. Prepare update body modifying session_id and shopping_mall_customer_id to null or changed
  const updateBody: IShoppingMallShoppingCart.IUpdate = {
    shopping_mall_customer_id: customer.id, // still same customer
    session_id: RandomGenerator.alphaNumeric(16),
  };

  // 4. Update the shopping cart
  const updatedCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.customer.shoppingCarts.update(
      connection,
      {
        shoppingCartId: cart.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCart);

  // Validate the updated fields
  TestValidator.equals(
    "Updated shopping cart shopping_mall_customer_id",
    updatedCart.shopping_mall_customer_id,
    updateBody.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "Updated shopping cart session_id",
    updatedCart.session_id,
    updateBody.session_id,
  );

  // 5. Attempt unauthorized update (simulate unauthenticated by empty headers)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("Unauthorized update should fail", async () => {
    await api.functional.shoppingMall.customer.shoppingCarts.update(
      unauthConnection,
      {
        shoppingCartId: cart.id,
        body: {
          session_id: RandomGenerator.alphaNumeric(12),
        },
      },
    );
  });
}
