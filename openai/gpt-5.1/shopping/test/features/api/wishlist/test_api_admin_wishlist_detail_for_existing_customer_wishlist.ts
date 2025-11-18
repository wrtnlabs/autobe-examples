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
 * Validate that an admin can retrieve full details of an existing
 * customer-owned wishlist.
 *
 * Business workflow:
 *
 * 1. Register a new customer via POST /auth/customer/join to obtain an
 *    authenticated customer context.
 * 2. As that customer, create a wishlist via POST
 *    /shoppingMall/customer/wishlists.
 * 3. Register a new admin via POST /auth/admin/join to switch the connection
 *    context to an admin.
 * 4. As the admin, retrieve the wishlist via GET
 *    /shoppingMall/admin/wishlists/{wishlistId}.
 * 5. Assert that the returned wishlist details match the originally created
 *    wishlist and reference the correct customer.
 */
export async function test_api_admin_wishlist_detail_for_existing_customer_wishlist(
  connection: api.IConnection,
) {
  // 1. Register a new customer and obtain authorized context
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 2. Create a wishlist as the authenticated customer
  const wishlistCreateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    // Let server decide default is_default when omitted; keep status explicit.
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(createdWishlist);

  // Basic sanity checks on created wishlist
  TestValidator.equals(
    "created wishlist name should match request",
    createdWishlist.name,
    wishlistCreateBody.name,
  );
  TestValidator.equals(
    "created wishlist status should match request",
    createdWishlist.status,
    wishlistCreateBody.status,
  );
  TestValidator.predicate(
    "created wishlist customer id should match authorized customer",
    createdWishlist.customer.id === customerAuthorized.id,
  );

  // 3. Register a new admin and obtain admin authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Admin retrieves wishlist detail by ID
  const adminViewedWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.admin.wishlists.at(connection, {
      wishlistId: createdWishlist.id,
    });
  typia.assert<IShoppingMallWishlist>(adminViewedWishlist);

  // 5. Assertions: admin view should reflect original data and ownership
  TestValidator.equals(
    "admin view wishlist id should match created wishlist id",
    adminViewedWishlist.id,
    createdWishlist.id,
  );
  TestValidator.equals(
    "admin view wishlist customer id should match original customer",
    adminViewedWishlist.customer.id,
    customerAuthorized.id,
  );
  TestValidator.equals(
    "admin view wishlist name should match created wishlist name",
    adminViewedWishlist.name,
    createdWishlist.name,
  );
  TestValidator.equals(
    "admin view wishlist status should match created wishlist status",
    adminViewedWishlist.status,
    createdWishlist.status,
  );
  TestValidator.predicate(
    "admin view wishlist deleted_at should be null or undefined for active wishlist",
    adminViewedWishlist.deleted_at === null ||
      adminViewedWishlist.deleted_at === undefined,
  );
  TestValidator.predicate(
    "admin view wishlist status should be a non-empty string",
    adminViewedWishlist.status.length > 0,
  );
}
