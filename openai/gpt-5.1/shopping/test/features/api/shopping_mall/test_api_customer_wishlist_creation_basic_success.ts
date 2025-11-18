import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate basic successful creation of a customer wishlist.
 *
 * Business goal
 *
 * - Ensure that a newly registered customer can create a wishlist using minimal
 *   required fields, and that the created wishlist is correctly associated with
 *   the customer and populated according to the IShoppingMallWishlist
 *   contract.
 *
 * Steps
 *
 * 1. Customer join
 *
 *    - Call api.functional.auth.customer.join with a randomly generated
 *         IShoppingMallCustomerJoin.IRequest payload.
 *    - Rely on the SDK to automatically install the Authorization header on the
 *         shared connection using the returned token.access value.
 *    - Capture the returned IShoppingMallCustomer.IAuthorized object for later
 *         ownership assertions.
 * 2. Create wishlist with minimal required fields
 *
 *    - Call api.functional.shoppingMall.customer.wishlists.create with an
 *         IShoppingMallWishlist.ICreate body containing: name: "My First
 *         Wishlist" description: null (explicitly null to exercise nullable
 *         handling) is_default: null (let service layer decide default
 *         semantics) status: "active" (explicit initial lifecycle status)
 *    - Await the response and assert it structurally with typia.assert to guarantee
 *         it conforms to IShoppingMallWishlist.
 * 3. Business assertions on response
 *
 *    - Verify that:
 *
 *         - Wishlist.name equals the requested name.
 *         - Wishlist.status equals the requested status string.
 *         - Wishlist.customer.id matches the id from the authorized customer returned by
 *                   join.
 *         - Wishlist.description is null (since we passed null explicitly).
 *         - Wishlist.is_default is a boolean (true or false). This accommodates the
 *                   business rule that the first wishlist may automatically
 *                   become the default when is_default is null.
 *         - Wishlist.created_at and wishlist.updated_at are present as date-time strings
 *                   (typia.assert already validates the format; we can
 *                   additionally assert they are non-empty and optionally that
 *                   created_at <= updated_at by string comparison for sanity).
 *         - Wishlist.deleted_at is null or undefined, indicating the wishlist is
 *                   logically active.
 */
export async function test_api_customer_wishlist_creation_basic_success(
  connection: api.IConnection,
) {
  // 1. Customer join
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Let server derive IP; explicitly set to null to exercise nullable path
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create wishlist with minimal required fields
  const wishlistCreateBody = {
    name: "My First Wishlist",
    description: null,
    is_default: null,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert(wishlist);

  // 3. Business assertions on response
  // 3-1. Name and status echo back from request
  TestValidator.equals(
    "wishlist name should match the requested name",
    wishlist.name,
    wishlistCreateBody.name,
  );
  TestValidator.equals(
    "wishlist status should match the requested status",
    wishlist.status,
    wishlistCreateBody.status,
  );

  // 3-2. Ownership: wishlist.customer.id must match authorized customer id
  TestValidator.equals(
    "wishlist customer id should match the authenticated customer id",
    wishlist.customer.id,
    authorizedCustomer.id,
  );

  // 3-3. Description should be null (explicitly passed as null)
  TestValidator.equals(
    "wishlist description should be null when created with null description",
    wishlist.description ?? null,
    null,
  );

  // 3-4. is_default must be a boolean (service may set true for first wishlist)
  TestValidator.predicate(
    "wishlist is_default should be a boolean value",
    typeof wishlist.is_default === "boolean",
  );

  // 3-5. created_at and updated_at should be non-empty strings; typia.assert
  // ensures date-time format, here we just check they exist and are non-empty.
  TestValidator.predicate(
    "wishlist created_at should be a non-empty string",
    typeof wishlist.created_at === "string" && wishlist.created_at.length > 0,
  );
  TestValidator.predicate(
    "wishlist updated_at should be a non-empty string",
    typeof wishlist.updated_at === "string" && wishlist.updated_at.length > 0,
  );

  // 3-6. deleted_at should be null or undefined for an active wishlist
  TestValidator.predicate(
    "wishlist deleted_at should be null or undefined on creation",
    wishlist.deleted_at === null || wishlist.deleted_at === undefined,
  );
}
