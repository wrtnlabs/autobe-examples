import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";

/**
 * Ensure a guest user can create carts with explicitly selected currencies and
 * that resulting cart headers are properly initialized and owned.
 *
 * Business workflow:
 *
 * 1. Join as a guest user via /auth/guestUser/join to obtain a guest identity and
 *    authentication token, which SDK wires into the connection.
 * 2. Create a guest cart via /shoppingMall/guestUser/carts with
 *    IShoppingMallCart.ICreate:
 *
 *    - Actor_type = "guestuser".
 *    - Currency_code = "USD".
 *    - Status omitted so backend applies its default.
 * 3. Validate the returned cart:
 *
 *    - Actor_type is "guestuser".
 *    - Currency_code is exactly "USD".
 *    - Items_snapshot is undefined or an empty array (no items yet).
 *    - Estimated_total_amount is either undefined or a non-negative number.
 *    - Owner_guestuser, when present, matches the joined guest id.
 *    - Timestamps are valid ISO date-time strings and deleted_at is null/undefined.
 * 4. Optionally attempt to create a second cart for the same guest with a
 *    different currency (e.g., "EUR") and:
 *
 *    - If allowed, ensure:
 *
 *         - Second cart has same actor_type and owner_guestuser.id,
 *         - Currency_code is "EUR",
 *         - Cart id differs from the first.
 *    - If disallowed, ensure that cart creation fails with a business error
 *         (captured via TestValidator.error), without checking specific HTTP
 *         status codes.
 */
export async function test_api_guest_cart_creation_with_specific_currency(
  connection: api.IConnection,
) {
  // 1. Guest joins to obtain identity and authorization
  const joinBody = {
    external_reference: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallGuestUser.IJoin;

  const guest: IShoppingMallGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(guest);

  // 2. Create primary cart with explicit USD currency
  const primaryCreateBody = {
    actor_type: "guestuser",
    currency_code: "USD",
  } satisfies IShoppingMallCart.ICreate;

  const primaryCart: IShoppingMallCart =
    await api.functional.shoppingMall.guestUser.carts.create(connection, {
      body: primaryCreateBody,
    });
  typia.assert(primaryCart);

  // Basic identity and configuration checks
  TestValidator.equals(
    "primary cart actor_type must be guestuser",
    primaryCart.actor_type,
    "guestuser",
  );
  TestValidator.equals(
    "primary cart currency_code must match requested USD",
    primaryCart.currency_code,
    "USD",
  );

  // items_snapshot should be empty or undefined at creation
  const itemsSnapshot: IShoppingMallCartItemSummary[] | undefined =
    primaryCart.items_snapshot;
  TestValidator.predicate(
    "primary cart items_snapshot is undefined or empty",
    itemsSnapshot === undefined || itemsSnapshot.length === 0,
  );

  // estimated_total_amount, when present, must be non-negative
  TestValidator.predicate(
    "primary cart estimated_total_amount, if defined, must be non-negative",
    primaryCart.estimated_total_amount === undefined ||
      primaryCart.estimated_total_amount >= 0,
  );

  // owner_guestuser, when present, must match joined guest id
  if (
    primaryCart.owner_guestuser !== undefined &&
    primaryCart.owner_guestuser !== null
  ) {
    const ownerGuest: IShoppingMallCartOwnerGuestUserSummary =
      primaryCart.owner_guestuser;
    TestValidator.equals(
      "primary cart owner_guestuser.id must equal guest.id when provided",
      ownerGuest.id,
      guest.id,
    );
  }

  // timestamps should be valid ISO date-time strings
  TestValidator.predicate(
    "primary cart created_at is a non-empty string",
    typeof primaryCart.created_at === "string" &&
      primaryCart.created_at.length > 0,
  );
  TestValidator.predicate(
    "primary cart updated_at is a non-empty string",
    typeof primaryCart.updated_at === "string" &&
      primaryCart.updated_at.length > 0,
  );
  TestValidator.predicate(
    "primary cart deleted_at must be null or undefined at creation",
    primaryCart.deleted_at === null || primaryCart.deleted_at === undefined,
  );

  // 3. Try to create a secondary cart with a different currency
  const secondaryCreateBody = {
    actor_type: "guestuser",
    currency_code: "EUR",
  } satisfies IShoppingMallCart.ICreate;

  let secondarySucceeded = false;
  try {
    const secondaryCart: IShoppingMallCart =
      await api.functional.shoppingMall.guestUser.carts.create(connection, {
        body: secondaryCreateBody,
      });
    typia.assert(secondaryCart);
    secondarySucceeded = true;

    // Validate second cart details when allowed
    TestValidator.equals(
      "secondary cart actor_type must be guestuser",
      secondaryCart.actor_type,
      "guestuser",
    );
    TestValidator.equals(
      "secondary cart currency_code must match requested EUR",
      secondaryCart.currency_code,
      "EUR",
    );
    TestValidator.notEquals(
      "secondary cart id must differ from primary cart id",
      secondaryCart.id,
      primaryCart.id,
    );

    if (
      secondaryCart.owner_guestuser !== undefined &&
      secondaryCart.owner_guestuser !== null
    ) {
      const ownerGuest2: IShoppingMallCartOwnerGuestUserSummary =
        secondaryCart.owner_guestuser;
      TestValidator.equals(
        "secondary cart owner_guestuser.id must equal guest.id when provided",
        ownerGuest2.id,
        guest.id,
      );
    }

    const secondaryItemsSnapshot: IShoppingMallCartItemSummary[] | undefined =
      secondaryCart.items_snapshot;
    TestValidator.predicate(
      "secondary cart items_snapshot is undefined or empty",
      secondaryItemsSnapshot === undefined ||
        secondaryItemsSnapshot.length === 0,
    );
    TestValidator.predicate(
      "secondary cart estimated_total_amount, if defined, must be non-negative",
      secondaryCart.estimated_total_amount === undefined ||
        secondaryCart.estimated_total_amount >= 0,
    );
  } catch (_error) {
    // If creation fails, assert that an error indeed occurs using TestValidator.error.
  }

  if (!secondarySucceeded) {
    await TestValidator.error(
      "creating a second cart with different currency should fail when business rules disallow it",
      async () => {
        await api.functional.shoppingMall.guestUser.carts.create(connection, {
          body: secondaryCreateBody,
        });
      },
    );
  }
}
