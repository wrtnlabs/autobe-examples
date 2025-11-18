import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";

/**
 * Validate that an authenticated customer can create a cart with an explicit
 * preferred currency.
 *
 * Business flow:
 *
 * 1. Register (join) a new customer via /auth/customer/join.
 *
 *    - Use a random but valid email, password, href, and referrer.
 *    - Let the backend derive IP (omit ip).
 *    - Confirm that authentication succeeds and the SDK attaches the Authorization
 *         header to the shared connection.
 * 2. Create a new cart via /shoppingMall/customer/carts.
 *
 *    - Request body type: IShoppingMallCart.ICreate.
 *    - Actor_type = "customer".
 *    - Currency_code = "KRW".
 *    - Status omitted so backend uses its default.
 * 3. Validate the returned IShoppingMallCart:
 *
 *    - Currency_code is exactly "KRW".
 *    - Actor_type is "customer".
 *    - Status is a non-empty string (initial lifecycle status).
 *    - Created_at and updated_at are populated (non-empty) and conform to date-time
 *         format (typia.assert guarantees this).
 *    - Deleted_at is null or undefined (cart is not soft-deleted).
 *    - Owner_customer is present (non-null/undefined), indicating the cart is bound
 *         to the authenticated customer.
 *    - Owner_guestuser is null or undefined (this is not a guest cart).
 *    - Items_snapshot is either undefined or an empty array (no items yet).
 *    - Estimated_total_amount, if present, is non-negative.
 */
export async function test_api_customer_cart_creation_with_preferred_currency(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create a new cart with explicit preferred currency "KRW"
  const createCartBody = {
    actor_type: "customer",
    currency_code: "KRW",
  } satisfies IShoppingMallCart.ICreate;

  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: createCartBody },
  );
  typia.assert(cart);

  // 3. Business assertions on the created cart
  TestValidator.equals("cart currency_code is KRW", cart.currency_code, "KRW");

  TestValidator.equals(
    "cart actor_type is customer",
    cart.actor_type,
    "customer",
  );

  TestValidator.predicate(
    "cart status is non-empty string",
    cart.status.length > 0,
  );

  TestValidator.predicate(
    "cart created_at is populated",
    cart.created_at.length > 0,
  );

  TestValidator.predicate(
    "cart updated_at is populated",
    cart.updated_at.length > 0,
  );

  TestValidator.predicate(
    "cart deleted_at is null or undefined",
    cart.deleted_at === null || cart.deleted_at === undefined,
  );

  TestValidator.predicate(
    "owner_customer is present for customer cart",
    cart.owner_customer !== null && cart.owner_customer !== undefined,
  );

  if (cart.owner_customer !== null && cart.owner_customer !== undefined) {
    TestValidator.predicate(
      "owner_customer.display_name is non-empty",
      cart.owner_customer.display_name.length > 0,
    );
  }

  TestValidator.predicate(
    "owner_guestuser is null or undefined for customer cart",
    cart.owner_guestuser === null || cart.owner_guestuser === undefined,
  );

  TestValidator.predicate(
    "new cart has no items in items_snapshot",
    !cart.items_snapshot || cart.items_snapshot.length === 0,
  );

  TestValidator.predicate(
    "estimated_total_amount is undefined or non-negative",
    cart.estimated_total_amount === undefined ||
      cart.estimated_total_amount >= 0,
  );
}
