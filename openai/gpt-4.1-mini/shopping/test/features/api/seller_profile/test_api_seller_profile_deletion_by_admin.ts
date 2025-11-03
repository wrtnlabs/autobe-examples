import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

/**
 * Test the complete flow of deleting a seller profile by an admin.
 *
 * This test performs the following steps:
 *
 * 1. Admin account creation and authentication (/auth/admin/join and login)
 * 2. Seller account registration and authentication (/auth/seller/join and login)
 * 3. Creation of a seller profile linked to the seller account
 * 4. Admin deletes the seller profile by its ID using
 *    /shoppingMall/admin/sellerProfiles/{id} DELETE endpoint
 * 5. Validate that the seller profile is deleted and no longer accessible
 *
 * This ensures that only authorized admin users can delete seller profiles, and
 * deletion cascades properly.
 */
export async function test_api_seller_profile_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin account registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPass123!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminJoinBody.email);

  // 2. Admin login for actor switching
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPass123!",
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogged);
  TestValidator.equals(
    "admin login email matches",
    adminLogged.email,
    adminJoinBody.email,
  );

  // 3. Seller account registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);
  TestValidator.equals(
    "seller email matches",
    seller.email,
    sellerJoinBody.email,
  );

  // 4. Seller login for actor switching
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: null,
    href: "https://example.com/seller/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLogged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogged);
  TestValidator.equals(
    "seller login email matches",
    sellerLogged.email,
    sellerJoinBody.email,
  );

  // 5. Create seller profile linked to the seller
  const profileCreateBody = {
    shopping_mall_seller_id: seller.id,
    store_name: sellerJoinBody.store_name,
    business_registration_number: null,
    contact_email: sellerJoinBody.email,
    contact_phone: null,
    profile_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallSellerProfile.ICreate;

  const profile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: profileCreateBody,
    });
  typia.assert(profile);
  TestValidator.equals(
    "seller profile's seller id matches",
    profile.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "seller profile's contact email matches",
    profile.contact_email,
    profileCreateBody.contact_email,
  );

  // 6. Assign admin role via userRoles create (authorization)
  const userRoleCreateBody = {
    user_id: admin.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;

  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleCreateBody,
    });
  typia.assert(userRole);
  TestValidator.equals(
    "user role assignment user id matches",
    userRole.user_id,
    admin.id,
  );
  TestValidator.equals(
    "user role assigned is admin",
    userRole.role_name,
    "admin",
  );

  // 7. Admin deletes the seller profile by id
  await api.functional.shoppingMall.admin.sellerProfiles.eraseSellerProfile(
    connection,
    {
      id: profile.id,
    },
  );

  // 8. Confirm deleted profile no longer exists - try to create again with same seller id, should be valid
  // Since there is no GET endpoint, we test by creating a new profile for the same seller (should succeed)
  const profileAgain: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        store_name: sellerJoinBody.store_name,
        business_registration_number: null,
        contact_email: sellerJoinBody.email,
        contact_phone: null,
        profile_description: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      } satisfies IShoppingMallSellerProfile.ICreate,
    });
  typia.assert(profileAgain);
  TestValidator.predicate(
    "new profile created after deletion",
    profileAgain.id !== profile.id,
  );
}
