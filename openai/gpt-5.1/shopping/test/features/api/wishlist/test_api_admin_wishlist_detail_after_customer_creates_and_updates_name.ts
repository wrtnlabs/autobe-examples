import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

/**
 * Validate that admin wishlist detail reflects a customer-created wishlist.
 *
 * Business goal
 *
 * - Ensure that when a customer creates a wishlist, its persisted data is
 *   correctly exposed by the admin detail endpoint GET
 *   /shoppingMall/admin/wishlists/{wishlistId}.
 * - Although the original narrative mentions renaming the wishlist, the currently
 *   provided SDK does not include an explicit wishlist update endpoint, so this
 *   test focuses on cross-actor consistency between customer-created data and
 *   admin-view detail for that wishlist.
 *
 * Scenario steps
 *
 * 1. Customer registration (join)
 *
 *    - Call POST /auth/customer/join with a valid IShoppingMallCustomerJoin.IRequest
 *         payload including:
 *
 *         - Email (random, format email)
 *         - Password (random, format password)
 *         - Optional ip (either omit or random IPv4/IPv6)
 *         - Href and referrer (random, format uri)
 *    - Receive IShoppingMallCustomer.IAuthorized, and rely on the SDK to attach the
 *         customer access token to the connection headers.
 * 2. Customer creates a wishlist
 *
 *    - While authenticated as the customer, call POST
 *         /shoppingMall/customer/wishlists using
 *         api.functional.shoppingMall.customer.wishlists.create with body:
 *
 *         - Name: deterministic string like "Customer Wishlist - Initial"
 *         - Description: a random paragraph or null
 *         - Is_default: true (so the wishlist is clearly primary) or false, but use a
 *                   specific boolean to assert later.
 *         - Status: "active" (simple business string)
 *    - Capture the returned IShoppingMallWishlist as `customerWishlist`.
 *    - Assert with typia.assert that the response matches IShoppingMallWishlist.
 * 3. Admin registration (join)
 *
 *    - Call POST /auth/admin/join with IShoppingMallAdminJoin.ICreate:
 *
 *         - Email: random admin email
 *         - Password: random password (tags.Format<"password">)
 *         - Ip: optional IPv4/IPv6 or null
 *         - Href/referrer: random URIs
 *    - The SDK will overwrite connection.headers.Authorization with the admin token,
 *         switching the connection into an admin-authenticated context.
 *    - Assert the returned IShoppingMallAdmin.IAuthorized with typia.assert.
 * 4. Admin retrieves wishlist detail
 *
 *    - As the admin, call GET /shoppingMall/admin/wishlists/{wishlistId} via
 *         api.functional.shoppingMall.admin.wishlists.at, passing the id of the
 *         `customerWishlist` as wishlistId.
 *    - Capture the result as `adminWishlist` and assert via typia.assert.
 * 5. Cross-actor consistency assertions
 *
 *    - Use TestValidator.equals/TestValidator.predicate to check that:
 *
 *         - `adminWishlist.id` equals `customerWishlist.id`.
 *         - `adminWishlist.name` equals the name used at creation ("Customer Wishlist -
 *                   Initial").
 *         - `adminWishlist.status` equals `customerWishlist.status`.
 *         - `adminWishlist.customer.id` equals the customer.id from the join response.
 *         - `adminWishlist.customer.email` equals the customer email used at join.
 *         - `adminWishlist.created_at` equals `customerWishlist.created_at`.
 *         - `adminWishlist.updated_at` equals `customerWishlist.updated_at`.
 *         - `adminWishlist.created_at` is not later than `adminWishlist.updated_at`
 *                   (monotonic timestamp check using string comparison after
 *                   converting to Date).
 *    - These checks validate that admin detail is reading the same persisted record
 *         that the customer created and that key attributes are consistent
 *         across actor views.
 */
export async function test_api_admin_wishlist_detail_after_customer_creates_and_updates_name(
  connection: api.IConnection,
) {
  // 1. Customer joins (registers) and becomes authenticated
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional; send null explicitly to respect nullable semantics
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  // 2. Customer creates a wishlist
  const wishlistName = "Customer Wishlist - Initial";
  const wishlistBody = {
    name: wishlistName,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const customerWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBody,
    });
  typia.assert(customerWishlist);

  // 3. Admin joins (registers) and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Admin retrieves wishlist detail by id
  const adminWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.admin.wishlists.at(connection, {
      wishlistId: customerWishlist.id,
    });
  typia.assert(adminWishlist);

  // 5. Cross-actor consistency assertions
  TestValidator.equals(
    "wishlist id should match between customer and admin views",
    adminWishlist.id,
    customerWishlist.id,
  );

  TestValidator.equals(
    "wishlist name should match created name",
    adminWishlist.name,
    wishlistName,
  );

  TestValidator.equals(
    "wishlist status should be consistent between views",
    adminWishlist.status,
    customerWishlist.status,
  );

  TestValidator.equals(
    "wishlist customer id should match authorized customer id",
    adminWishlist.customer.id,
    customerAuthorized.id,
  );

  TestValidator.equals(
    "wishlist customer email should match customer join email",
    adminWishlist.customer.email,
    customerJoinBody.email,
  );

  TestValidator.equals(
    "created_at should match between customer and admin wishlists",
    adminWishlist.created_at,
    customerWishlist.created_at,
  );

  TestValidator.equals(
    "updated_at should match between customer and admin wishlists",
    adminWishlist.updated_at,
    customerWishlist.updated_at,
  );

  // Monotonic timestamp check: created_at <= updated_at
  const createdAt = new Date(adminWishlist.created_at).getTime();
  const updatedAt = new Date(adminWishlist.updated_at).getTime();
  TestValidator.predicate(
    "wishlist updated_at should not be earlier than created_at",
    createdAt <= updatedAt,
  );
}
