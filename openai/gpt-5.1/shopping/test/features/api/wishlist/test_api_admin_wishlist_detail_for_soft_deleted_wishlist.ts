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
 * Validate that an admin can retrieve detailed information for an existing,
 * active wishlist.
 *
 * Original scenario mentioned soft-deleted wishlists, but no delete/soft-delete
 * API is available in the exposed SDK. Therefore, this test focuses on the
 * implementable subset: verifying that an admin can load the detail view of an
 * active wishlist created by a customer, and that `deleted_at` is null.
 *
 * Business flow:
 *
 * 1. A new customer joins the platform.
 * 2. The customer creates a wishlist with a specific name and status.
 * 3. A new admin joins the platform, establishing an admin authentication context.
 * 4. Using admin credentials, the test calls the admin wishlist detail endpoint
 *    with the wishlist id.
 * 5. The response is validated to ensure the wishlist details match what was
 *    created by the customer and that `deleted_at` remains null (not
 *    soft-deleted).
 */
export async function test_api_admin_wishlist_detail_for_soft_deleted_wishlist(
  connection: api.IConnection,
) {
  // 1. Customer registration (join): establishes a customer-authenticated context
  const customerJoinBody = typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Customer creates a wishlist
  const wishlistName = "Admin detail test wishlist";
  const wishlistStatus = "active";

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: {
        name: wishlistName,
        description: "Wishlist for admin detail visibility test",
        is_default: true,
        status: wishlistStatus,
      } satisfies IShoppingMallWishlist.ICreate,
    });
  typia.assert<IShoppingMallWishlist>(createdWishlist);

  // Validate that the created wishlist matches expectations from the customer side
  TestValidator.equals(
    "created wishlist belongs to the joined customer",
    createdWishlist.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "created wishlist name matches requested name",
    createdWishlist.name,
    wishlistName,
  );
  TestValidator.equals(
    "created wishlist status matches requested status",
    createdWishlist.status,
    wishlistStatus,
  );
  TestValidator.equals(
    "newly created wishlist is not soft-deleted (deleted_at null)",
    createdWishlist.deleted_at,
    null,
  );

  // 3. Admin registration (join) - switches authentication context to admin
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 4. Admin fetches wishlist detail by id
  const adminView: IShoppingMallWishlist =
    await api.functional.shoppingMall.admin.wishlists.at(connection, {
      wishlistId: createdWishlist.id,
    });
  typia.assert<IShoppingMallWishlist>(adminView);

  // 5. Validate admin detail response consistency with the original wishlist
  TestValidator.equals(
    "admin view returns same wishlist id as created wishlist",
    adminView.id,
    createdWishlist.id,
  );
  TestValidator.equals(
    "admin view preserves wishlist name",
    adminView.name,
    createdWishlist.name,
  );
  TestValidator.equals(
    "admin view preserves wishlist status",
    adminView.status,
    createdWishlist.status,
  );
  TestValidator.equals(
    "admin view owner id matches original customer id",
    adminView.customer.id,
    createdWishlist.customer.id,
  );
  TestValidator.equals(
    "admin view shows wishlist as not soft-deleted (deleted_at null)",
    adminView.deleted_at,
    null,
  );
}
