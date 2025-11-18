import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_customer_wishlist_creation_basic(
  connection: api.IConnection,
) {
  // 1. Register a new customer (join) to obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create a basic wishlist for the authenticated customer
  const wishlistName: string = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 10,
  });
  const wishlistStatus = "active";

  const createWishlistBody = {
    name: wishlistName,
    description: null,
    is_default: true,
    status: wishlistStatus,
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createWishlistBody,
    });
  typia.assert(wishlist);

  // 3. Validate wishlist core fields
  TestValidator.predicate(
    "wishlist id must be a non-empty string",
    typeof wishlist.id === "string" && wishlist.id.length > 0,
  );

  TestValidator.equals(
    "wishlist name should match request",
    wishlist.name,
    wishlistName,
  );

  TestValidator.equals(
    "wishlist description should be null as requested",
    wishlist.description ?? null,
    null,
  );

  TestValidator.equals(
    "wishlist is_default should be true as requested",
    wishlist.is_default,
    true,
  );

  TestValidator.equals(
    "wishlist status should match request",
    wishlist.status,
    wishlistStatus,
  );

  // 4. Validate ownership mapping to authenticated customer
  const ownerSummary = wishlist.customer;
  typia.assert<IShoppingMallCustomer.ISummary>(ownerSummary);

  TestValidator.equals(
    "wishlist customer id should match authorized customer id",
    ownerSummary.id,
    authorizedCustomer.id,
  );

  TestValidator.equals(
    "wishlist customer email should match authorized customer email",
    ownerSummary.email,
    authorizedCustomer.email,
  );

  // 5. Validate timestamps
  TestValidator.predicate(
    "wishlist created_at should be a non-empty string",
    typeof wishlist.created_at === "string" && wishlist.created_at.length > 0,
  );

  TestValidator.predicate(
    "wishlist updated_at should be a non-empty string",
    typeof wishlist.updated_at === "string" && wishlist.updated_at.length > 0,
  );

  TestValidator.equals(
    "wishlist deleted_at should be null",
    wishlist.deleted_at ?? null,
    null,
  );
}
