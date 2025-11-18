import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate creation of a non-default customer wishlist with explicit
 * description and non-default status.
 *
 * Business context: A logged-in shopping mall customer can manage multiple
 * wishlists. This test verifies that a customer can create a wishlist that is
 * explicitly marked as non-default (is_default = false) while providing a
 * human-readable description and a non-default status value. It also ensures
 * the wishlist is correctly bound to the authenticated customer and that
 * lifecycle timestamps are initialized as expected.
 *
 * Steps:
 *
 * 1. Customer join (registration + authentication) using /auth/customer/join.
 * 2. Create a wishlist via /shoppingMall/customer/wishlists with:
 *
 *    - Name: "Holiday Gifts"
 *    - Description: "Things to buy for holidays"
 *    - Is_default: false
 *    - Status: "active"
 * 3. Validate response fields and ownership.
 */
export async function test_api_customer_wishlist_creation_with_description_and_non_default_status(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);

  // 2. Create a non-default wishlist with explicit description and status.
  const wishlistCreateBody = {
    name: "Holiday Gifts",
    description: "Things to buy for holidays",
    is_default: false,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(wishlist);

  // 3. Validate core fields and relationships.
  TestValidator.equals(
    "wishlist name should match the requested name",
    wishlist.name,
    "Holiday Gifts",
  );

  TestValidator.equals(
    "wishlist description should match the requested description",
    wishlist.description,
    "Things to buy for holidays",
  );

  TestValidator.equals(
    "wishlist should be explicitly non-default",
    wishlist.is_default,
    false,
  );

  TestValidator.equals(
    "wishlist status should match the requested status",
    wishlist.status,
    "active",
  );

  TestValidator.equals(
    "wishlist customer id should match the authenticated customer id",
    wishlist.customer.id,
    authorizedCustomer.id,
  );

  // created_at and updated_at existence is guaranteed by typia.assert format
  // validation, but we additionally ensure they are truthy strings.
  TestValidator.predicate(
    "wishlist created_at should be a non-empty string",
    typeof wishlist.created_at === "string" && wishlist.created_at.length > 0,
  );

  TestValidator.predicate(
    "wishlist updated_at should be a non-empty string",
    typeof wishlist.updated_at === "string" && wishlist.updated_at.length > 0,
  );

  // deleted_at should be null for a newly created, non-deleted wishlist.
  TestValidator.equals(
    "wishlist deleted_at should be null on creation",
    wishlist.deleted_at ?? null,
    null,
  );
}
