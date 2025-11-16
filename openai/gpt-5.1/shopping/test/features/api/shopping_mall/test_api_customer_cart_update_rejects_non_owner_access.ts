import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";

/**
 * Ensure that a customer cannot update another customer's cart.
 *
 * Business context:
 *
 * - Customer A creates a persistent shopping cart.
 * - Customer B, a different authenticated customer, attempts to update Customer
 *   A's cart using the cart id.
 * - The system must enforce ownership checks so that only the owning customer can
 *   update their cart.
 *
 * Steps:
 *
 * 1. Register and authenticate Customer A via POST /auth/customer/join.
 * 2. With Customer A's token, create a cart via POST
 *    /shoppingMall/customer/customerCarts and capture cartA.id.
 * 3. Prepare a deterministic IShoppingMallCustomerCart.IUpdate payload.
 * 4. Register and authenticate Customer B via a second POST /auth/customer/join,
 *    which switches the Authorization header.
 * 5. As Customer B, attempt to update Customer A's cart using
 *    api.functional.shoppingMall.customer.customerCarts.update.
 * 6. Assert that the update call fails using TestValidator.error, proving that
 *    non-owners cannot modify another customer's cart.
 */
export async function test_api_customer_cart_update_rejects_non_owner_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate Customer A
  const joinBodyA = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://customer-a.example.com/join",
    referrer: "https://customer-a.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyA,
    });
  typia.assert(authA);

  // 2. Create a cart for Customer A
  const createCartBodyA = {
    currency_code: "USD",
    region_code: "US",
    channel: "web",
    metadata: {
      seed: RandomGenerator.alphaNumeric(8),
    },
    is_active: true,
    source_guest_token: undefined,
  } satisfies IShoppingMallCustomerCart.ICreate;

  const cartA: IShoppingMallCustomerCart =
    await api.functional.shoppingMall.customer.customerCarts.create(
      connection,
      {
        body: createCartBodyA,
      },
    );
  typia.assert(cartA);

  TestValidator.predicate(
    "created cart A has a non-empty UUID id",
    typeof cartA.id === "string" && cartA.id.length > 0,
  );

  // 3. Prepare deterministic update payload
  const updatePayload = {
    display_name: "Cart updated by non-owner attempt",
    region_code: "US-TEST",
    currency_code: "USD",
    is_active: false,
    notes:
      "This update should not be applied because the actor is not the owner.",
  } satisfies IShoppingMallCustomerCart.IUpdate;

  // 4. Register and authenticate Customer B (switches Authorization)
  const joinBodyB = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    name: RandomGenerator.name(2),
    ip: null,
    href: "https://customer-b.example.com/join",
    referrer: "https://customer-b.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const authB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBodyB,
    });
  typia.assert(authB);

  TestValidator.notEquals(
    "customer A and customer B must be different accounts",
    authA.id,
    authB.id,
  );

  // 5. As Customer B, attempt to update Customer A's cart
  await TestValidator.error(
    "non-owner customer must not be able to update another customer's cart",
    async () => {
      await api.functional.shoppingMall.customer.customerCarts.update(
        connection,
        {
          customerCartId: cartA.id,
          body: updatePayload,
        },
      );
    },
  );
}
