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

export async function test_api_admin_wishlist_detail_for_default_vs_non_default_status(
  connection: api.IConnection,
) {
  // 1. Customer joins the platform and becomes authenticated on the connection.
  const customerJoinRequest =
    typia.random<IShoppingMallCustomerJoin.IRequest>();

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinRequest,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuth);

  const customerId = customerAuth.id;

  // 2. Customer creates a default wishlist (is_default: true, status: "active").
  const defaultWishlistName = RandomGenerator.paragraph({ sentences: 2 });
  const defaultWishlistDescription = RandomGenerator.paragraph({
    sentences: 4,
  });
  const defaultStatus = "active";

  const defaultCreateBody = {
    name: defaultWishlistName,
    description: defaultWishlistDescription,
    is_default: true,
    status: defaultStatus,
  } satisfies IShoppingMallWishlist.ICreate;

  const defaultWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: defaultCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(defaultWishlist);

  TestValidator.equals(
    "default wishlist belongs to joined customer",
    defaultWishlist.customer.id,
    customerId,
  );

  // 3. Customer creates a secondary non-default wishlist (is_default: false).
  const secondaryWishlistName = RandomGenerator.paragraph({ sentences: 2 });
  const secondaryWishlistDescription = RandomGenerator.paragraph({
    sentences: 3,
  });
  const secondaryStatus = "archived";

  const secondaryCreateBody = {
    name: secondaryWishlistName,
    description: secondaryWishlistDescription,
    is_default: false,
    status: secondaryStatus,
  } satisfies IShoppingMallWishlist.ICreate;

  const secondaryWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: secondaryCreateBody,
    });
  typia.assert<IShoppingMallWishlist>(secondaryWishlist);

  TestValidator.equals(
    "secondary wishlist belongs to same customer",
    secondaryWishlist.customer.id,
    customerId,
  );

  // 4. Admin joins the platform and becomes authenticated on the same connection.
  const adminJoinRequest = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 5. Admin fetches default wishlist detail and validates its fields.
  const adminViewDefault: IShoppingMallWishlist =
    await api.functional.shoppingMall.admin.wishlists.at(connection, {
      wishlistId: defaultWishlist.id,
    });
  typia.assert<IShoppingMallWishlist>(adminViewDefault);

  TestValidator.equals(
    "admin sees same wishlist id for default",
    adminViewDefault.id,
    defaultWishlist.id,
  );
  TestValidator.equals(
    "admin sees default wishlist is_default true",
    adminViewDefault.is_default,
    true,
  );
  TestValidator.equals(
    "admin sees default wishlist status matches created",
    adminViewDefault.status,
    defaultStatus,
  );
  TestValidator.equals(
    "admin sees default wishlist name matches created",
    adminViewDefault.name,
    defaultWishlistName,
  );
  TestValidator.equals(
    "admin sees default wishlist description matches created",
    adminViewDefault.description,
    defaultWishlistDescription,
  );
  TestValidator.equals(
    "admin sees correct customer on default wishlist",
    adminViewDefault.customer.id,
    customerId,
  );

  // 6. Admin fetches secondary wishlist detail and validates its fields.
  const adminViewSecondary: IShoppingMallWishlist =
    await api.functional.shoppingMall.admin.wishlists.at(connection, {
      wishlistId: secondaryWishlist.id,
    });
  typia.assert<IShoppingMallWishlist>(adminViewSecondary);

  TestValidator.equals(
    "admin sees same wishlist id for secondary",
    adminViewSecondary.id,
    secondaryWishlist.id,
  );
  TestValidator.equals(
    "admin sees secondary wishlist is_default false",
    adminViewSecondary.is_default,
    false,
  );
  TestValidator.equals(
    "admin sees secondary wishlist status matches created",
    adminViewSecondary.status,
    secondaryStatus,
  );
  TestValidator.equals(
    "admin sees secondary wishlist name matches created",
    adminViewSecondary.name,
    secondaryWishlistName,
  );
  TestValidator.equals(
    "admin sees secondary wishlist description matches created",
    adminViewSecondary.description,
    secondaryWishlistDescription,
  );
  TestValidator.equals(
    "admin sees correct customer on secondary wishlist",
    adminViewSecondary.customer.id,
    customerId,
  );
}
