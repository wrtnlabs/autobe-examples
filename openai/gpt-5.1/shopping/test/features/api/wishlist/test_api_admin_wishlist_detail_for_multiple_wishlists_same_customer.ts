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
 * Validate that an admin can retrieve the correct wishlist detail when a
 * customer owns multiple wishlists.
 *
 * Business purpose
 *
 * - Ensure that GET /shoppingMall/admin/wishlists/{wishlistId} returns the
 *   specific wishlist targeted by its ID, even if the same customer has
 *   multiple wishlists.
 * - Confirm that the wishlist returned belongs to the expected customer and that
 *   there is no cross-contamination between wishlists A and B.
 *
 * Flow
 *
 * 1. Customer self-registers via POST /auth/customer/join.
 * 2. Acting as that customer, create Wishlist A ("Primary List", default, status
 *    "active") via POST /shoppingMall/customer/wishlists.
 * 3. Still as the same customer, create Wishlist B ("Secondary List", non-default,
 *    status "active").
 * 4. Register an admin via POST /auth/admin/join. The SDK will switch the
 *    connection to use the admin token.
 * 5. As admin, call GET /shoppingMall/admin/wishlists/{wishlistId} with wishlistId
 *    set to Wishlist B.id.
 * 6. Assert that the returned wishlist matches Wishlist B (id, name, is_default,
 *    status) and that the customer summary matches the original customer.
 * 7. Assert that Wishlist A.id !== Wishlist B.id to guarantee that the admin
 *    lookup is not accidentally returning Wishlist A.
 */
export async function test_api_admin_wishlist_detail_for_multiple_wishlists_same_customer(
  connection: api.IConnection,
) {
  // 1. Customer self-registers
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();
  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorized);

  const customerId = customerAuthorized.id;
  const customerEmail = customerAuthorized.email;

  // 2. Create Wishlist A as this customer
  const wishlistABody = {
    name: "Primary List",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_default: true,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistA: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistABody,
    });
  typia.assert(wishlistA);

  TestValidator.equals(
    "wishlist A owner should match customer from join",
    wishlistA.customer.id,
    customerId,
  );

  // 3. Create Wishlist B as the same customer
  const wishlistBBody = {
    name: "Secondary List",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_default: false,
    status: "active",
  } satisfies IShoppingMallWishlist.ICreate;

  const wishlistB: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: wishlistBBody,
    });
  typia.assert(wishlistB);

  TestValidator.equals(
    "wishlist B owner should match customer from join",
    wishlistB.customer.id,
    customerId,
  );

  TestValidator.notEquals(
    "wishlist A and B must have different ids",
    wishlistA.id,
    wishlistB.id,
  );

  // Sanity checks on customer summary consistency between wishlists
  TestValidator.equals(
    "wishlist A and B should have same customer id",
    wishlistA.customer.id,
    wishlistB.customer.id,
  );
  TestValidator.equals(
    "wishlist A and B should have same customer email",
    wishlistA.customer.email,
    wishlistB.customer.email,
  );

  // 4. Register an admin (join) – switches connection to admin token
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. As admin, get wishlist B by id
  const adminWishlistB: IShoppingMallWishlist =
    await api.functional.shoppingMall.admin.wishlists.at(connection, {
      wishlistId: wishlistB.id as string & tags.Format<"uuid">,
    });
  typia.assert(adminWishlistB);

  // 6. Validate that adminWishlistB corresponds to Wishlist B, not A
  TestValidator.equals(
    "admin view wishlist id must equal wishlist B id",
    adminWishlistB.id,
    wishlistB.id,
  );
  TestValidator.equals(
    "admin view wishlist name must equal wishlist B name",
    adminWishlistB.name,
    wishlistBBody.name,
  );
  TestValidator.equals(
    "admin view wishlist status must equal wishlist B status",
    adminWishlistB.status,
    wishlistBBody.status,
  );
  TestValidator.equals(
    "admin view wishlist is_default must equal wishlist B is_default",
    adminWishlistB.is_default,
    wishlistBBody.is_default,
  );

  TestValidator.notEquals(
    "admin view wishlist must not accidentally match wishlist A id",
    adminWishlistB.id,
    wishlistA.id,
  );

  // 7. Validate customer ownership consistency from admin perspective
  TestValidator.equals(
    "admin view wishlist customer id must equal original customer id",
    adminWishlistB.customer.id,
    customerId,
  );
  TestValidator.equals(
    "admin view wishlist customer email must equal original customer email",
    adminWishlistB.customer.email,
    customerEmail,
  );

  // Sanity checks on timestamps being present (business-level expectations)
  TestValidator.predicate(
    "wishlist A created_at should be a non-empty string",
    wishlistA.created_at.length > 0,
  );
  TestValidator.predicate(
    "wishlist B created_at should be a non-empty string",
    wishlistB.created_at.length > 0,
  );
  TestValidator.predicate(
    "admin wishlist B created_at should be a non-empty string",
    adminWishlistB.created_at.length > 0,
  );
}
