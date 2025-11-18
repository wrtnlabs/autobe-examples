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
 * Basic happy-path test for customer cart creation.
 *
 * This scenario verifies that:
 *
 * - A freshly joined customer can immediately create a cart header using POST
 *   /shoppingMall/customer/carts.
 * - Minimal required fields in IShoppingMallCart.ICreate (actor_type only) are
 *   sufficient and default values are applied to other fields.
 * - The resulting IShoppingMallCart response is structurally valid and
 *   business-wise consistent with an empty, active customer cart.
 *
 * Steps:
 *
 * 1. Join a new customer via POST /auth/customer/join using a random
 *    IShoppingMallCustomerJoin.IRequest payload.
 * 2. Rely on the SDK to set the Authorization header on the shared connection from
 *    the returned IAuthorizationToken.
 * 3. Create a new cart with actor_type="customer" while omitting status and
 *    currency_code to let the backend apply defaults.
 * 4. Validate core cart fields and ensure the cart is in a non-deleted, empty
 *    state from the customer’s perspective.
 */
export async function test_api_customer_cart_creation_basic(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) to obtain an authenticated context.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a new customer-owned cart with minimal payload.
  const createCartBody = {
    actor_type: "customer",
  } satisfies IShoppingMallCart.ICreate;

  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: createCartBody,
    });
  typia.assert(cart);

  // 3. Validate actor_type is correctly set to "customer".
  TestValidator.equals(
    "cart actor_type must be customer",
    cart.actor_type,
    "customer",
  );

  // 4. Validate status and currency_code are non-empty strings.
  TestValidator.predicate(
    "cart status must be a non-empty string",
    typeof cart.status === "string" && cart.status.length > 0,
  );

  TestValidator.predicate(
    "cart currency_code must be a non-empty string",
    typeof cart.currency_code === "string" && cart.currency_code.length > 0,
  );

  // 5. Validate deleted_at represents a non-deleted cart.
  TestValidator.predicate(
    "cart deleted_at must be null or undefined on creation",
    cart.deleted_at === null || cart.deleted_at === undefined,
  );

  // 6. If the owner_customer summary is provided, ensure it matches the
  // authenticated customer.
  if (cart.owner_customer !== null && cart.owner_customer !== undefined) {
    const ownerCustomer: IShoppingMallCartOwnerCustomerSummary =
      cart.owner_customer;

    TestValidator.equals(
      "owner_customer.id must match authorized customer id",
      ownerCustomer.id,
      authorizedCustomer.id,
    );

    TestValidator.predicate(
      "owner_customer.display_name must be non-empty",
      ownerCustomer.display_name.length > 0,
    );
  }

  // 7. If an items_snapshot array is present, it must represent an empty cart.
  if (cart.items_snapshot !== undefined) {
    TestValidator.equals(
      "newly created cart must have empty items_snapshot when present",
      cart.items_snapshot.length,
      0,
    );
  }
}
