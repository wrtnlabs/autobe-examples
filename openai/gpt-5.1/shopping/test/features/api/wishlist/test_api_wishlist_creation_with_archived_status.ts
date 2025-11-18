import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate creation of a customer-owned wishlist with an initial "archived"
 * status.
 *
 * Business context:
 *
 * - Customers can register (join) the shopping mall and immediately obtain an
 *   authenticated customer context via IShoppingMallCustomer.IAuthorized.
 * - Authenticated customers may create wishlists with explicit lifecycle
 *   statuses, including non-active ones such as "archived".
 * - Non-active wishlists are still persisted, owned by the customer, and
 *   readable, but business rules may treat them differently in downstream
 *   item-suggestion flows (out of scope for this test).
 *
 * This test verifies that:
 *
 * 1. A new customer can successfully join via POST /auth/customer/join.
 * 2. Using the authenticated connection, the customer can call POST
 *    /shoppingMall/customer/wishlists with an IShoppingMallWishlist.ICreate
 *    payload where:
 *
 *    - Name is a valid human-readable string,
 *    - Description is explicitly null (testing optional-null semantics),
 *    - Status is "archived" (a non-active but valid lifecycle state),
 *    - Is_default is explicitly false.
 * 3. The response:
 *
 *    - Conforms to IShoppingMallWishlist (validated by typia.assert),
 *    - Reflects status === "archived",
 *    - Has is_default === false,
 *    - Is owned by the authenticated customer (customer.id equality),
 *    - Has deleted_at === null (not soft-deleted at creation).
 */
export async function test_api_wishlist_creation_with_archived_status(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // let server derive IP if omitted; href/referrer must be explicit URIs
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a wishlist with initial "archived" status and non-default flag.
  const wishlistCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: null,
    is_default: false,
    status: "archived",
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(createdWishlist);

  // 3. Business assertions on the created wishlist.
  TestValidator.equals(
    "wishlist status matches requested archived state",
    createdWishlist.status,
    wishlistCreateBody.status,
  );

  TestValidator.equals(
    "wishlist is_default is false as requested",
    createdWishlist.is_default,
    wishlistCreateBody.is_default,
  );

  TestValidator.equals(
    "wishlist customer id matches authorized customer id",
    createdWishlist.customer.id,
    authorizedCustomer.id,
  );

  TestValidator.equals(
    "wishlist deleted_at is null on creation",
    createdWishlist.deleted_at ?? null,
    null,
  );
}
