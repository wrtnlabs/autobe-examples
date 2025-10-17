import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";

export async function test_api_shopping_cart_update_by_guest(
  connection: api.IConnection,
) {
  // 1. Authenticate as guest user via join endpoint, get authorized guest entity
  const guestAuthorized: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        session_token: RandomGenerator.alphaNumeric(20),
        ip_address: `192.168.${RandomGenerator.alphaNumeric(1)}.${RandomGenerator.alphaNumeric(2)}`,
        user_agent: RandomGenerator.name(3),
      } satisfies IShoppingMallGuest.ICreate,
    });
  typia.assert(guestAuthorized);

  // 2. Create guest session explicitly to link shopping cart
  const guest: IShoppingMallGuest =
    await api.functional.shoppingMall.guests.create(connection, {
      body: {
        session_token: guestAuthorized.session_token,
        ip_address: guestAuthorized.ip_address ?? null,
        user_agent: guestAuthorized.user_agent ?? null,
      } satisfies IShoppingMallGuest.ICreate,
    });
  typia.assert(guest);

  // 3. Create a shopping cart linked to the guest session
  const shoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.guest.shoppingCarts.create(connection, {
      body: {
        session_id: guest.session_token,
        shopping_mall_customer_id: null,
      } satisfies IShoppingMallShoppingCart.ICreate,
    });
  typia.assert(shoppingCart);

  // 4. Update the shopping cart, for example modify session_id (simulate update) or keep same
  const sessionIdUpdate = shoppingCart.session_id ?? null;

  // Prepare update body
  const updateBody: IShoppingMallShoppingCart.IUpdate = {
    session_id: sessionIdUpdate,
    shopping_mall_customer_id: null,
  };

  // 5. Call update API with shoppingCart.id and update body
  const updatedShoppingCart: IShoppingMallShoppingCart =
    await api.functional.shoppingMall.guest.shoppingCarts.update(connection, {
      shoppingCartId: shoppingCart.id,
      body: updateBody,
    });
  typia.assert(updatedShoppingCart);

  // 6. Validate that id remains same and session_id remains or changes as expected
  TestValidator.equals(
    "shopping cart id should be unchanged after update",
    updatedShoppingCart.id,
    shoppingCart.id,
  );
  TestValidator.equals(
    "shopping cart session_id should remain same after update",
    updatedShoppingCart.session_id,
    sessionIdUpdate,
  );
  TestValidator.equals(
    "shopping cart shopping_mall_customer_id remains null",
    updatedShoppingCart.shopping_mall_customer_id,
    null,
  );

  // 7. Validate timestamps: updated_at should be same or later than created_at
  const createdAt = new Date(shoppingCart.created_at).getTime();
  const updatedAt = new Date(updatedShoppingCart.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be equal or greater than created_at",
    updatedAt >= createdAt,
  );

  // 8. Ensure deleted_at remains null or undefined
  TestValidator.predicate(
    "deleted_at should remain null or undefined",
    updatedShoppingCart.deleted_at === null ||
      updatedShoppingCart.deleted_at === undefined,
  );
}
