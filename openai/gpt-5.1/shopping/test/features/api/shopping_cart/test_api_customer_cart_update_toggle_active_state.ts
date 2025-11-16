import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Verify that a customer can toggle a cart’s active state using the cart update
 * API.
 *
 * Business workflow covered:
 *
 * 1. A new customer joins the platform using POST /auth/customer/join.
 * 2. While authenticated as that customer, a new cart is created using POST
 *    /shoppingMall/customer/customerCarts. The cart should start in an active
 *    state, either by explicit is_active: true or by backend default.
 * 3. The customer calls PUT /shoppingMall/customer/customerCarts/{customerCartId}
 *    with IShoppingMallCustomerCart.IUpdate, setting is_active to false to
 *    "archive" the cart.
 * 4. The response must show is_active === false and must still be a valid
 *    IShoppingMallCustomerCart snapshot.
 * 5. The customer then calls the same update endpoint again, setting is_active
 *    back to true to "reactivate" the cart.
 * 6. The final response must show is_active === true and preserve the cart id,
 *    proving that the same cart has been toggled between active/inactive
 *    states.
 *
 * The test validates that:
 *
 * - A customer can explicitly archive and reactivate carts via the update API.
 * - The is_active flag is persisted and reflected correctly by the backend.
 * - Other cart fields remain structurally valid across updates.
 */
export async function test_api_customer_cart_update_toggle_active_state(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer so that subsequent calls
  //    as this connection represent that customer.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(),
    // ip is optional (string | null | undefined). Let the backend infer it by
    // omitting the field to keep the request simple and valid.
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // After join, the SDK has already set connection.headers.Authorization
  // with the access token, so subsequent calls use this customer context.

  // 2. Create a new active customer cart.
  const createCartBody = {
    // Let backend defaults decide currency/region; explicitly request an
    // active cart to match the scenario focus.
    is_active: true,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const createdCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createCartBody,
      },
    );
  typia.assert(createdCart);

  // Basic sanity: cart belongs to some customer and is active as expected.
  TestValidator.predicate(
    "created cart should be active",
    createdCart.is_active === true,
  );

  // 3. Archive the cart by setting is_active to false via update.
  const deactivateBody = {
    is_active: false,
  } satisfies IShoppingMallCustomerCart.IUpdate;

  const deactivatedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.update(
      connection,
      {
        customerCartId: createdCart.id,
        body: deactivateBody,
      },
    );
  typia.assert(deactivatedCart);

  // 4. Validate that the cart is now inactive and the id is preserved.
  TestValidator.equals(
    "deactivated cart id should match original",
    deactivatedCart.id,
    createdCart.id,
  );
  TestValidator.predicate(
    "cart should be inactive after deactivation update",
    deactivatedCart.is_active === false,
  );

  // 5. Reactivate the same cart by setting is_active back to true.
  const reactivateBody = {
    is_active: true,
  } satisfies IShoppingMallCustomerCart.IUpdate;

  const reactivatedCart: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.update(
      connection,
      {
        customerCartId: createdCart.id,
        body: reactivateBody,
      },
    );
  typia.assert(reactivatedCart);

  // 6. Validate that the cart has been reactivated and id is unchanged.
  TestValidator.equals(
    "reactivated cart id should still match original",
    reactivatedCart.id,
    createdCart.id,
  );
  TestValidator.predicate(
    "cart should be active again after reactivation update",
    reactivatedCart.is_active === true,
  );

  // Additional structural sanity checks across snapshots:
  TestValidator.equals(
    "cart customer id remains consistent across lifecycle",
    deactivatedCart.customer.id,
    createdCart.customer.id,
  );
  TestValidator.equals(
    "cart customer id remains consistent after reactivation",
    reactivatedCart.customer.id,
    createdCart.customer.id,
  );
}
