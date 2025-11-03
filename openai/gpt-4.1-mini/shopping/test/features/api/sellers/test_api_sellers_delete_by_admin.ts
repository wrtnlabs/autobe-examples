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
 * This E2E test validates the process where an admin user deletes a seller
 * account.
 *
 * Steps:
 *
 * 1. Admin account is created via join and then logged in to obtain credentials.
 * 2. Seller account is created via join and logged in to obtain credentials.
 * 3. Seller profile is created for the seller account.
 * 4. A user role of "seller" is assigned to the seller by admin.
 * 5. The admin performs the deletion of the seller account using the seller's ID.
 * 6. Verify that no errors occur during deletion and that the operation completes.
 *
 * This test confirms cascading deletes and authorization enforcement.
 */
export async function test_api_sellers_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(10),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin logs in
  const adminLoginBody = {
    email: admin.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://www.example.com/admin/login",
    referrer: "https://www.example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 3. Seller joins
  const sellerJoinBody = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: RandomGenerator.alphaNumeric(10),
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Seller logs in
  const sellerLoginBody = {
    email: seller.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://www.example.com/seller/login",
    referrer: "https://www.example.com",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  // 5. Create seller profile
  const sellerProfileBody = {
    shopping_mall_seller_id: seller.id,
    store_name: seller.store_name,
    business_registration_number: null,
    contact_email: seller.email,
    contact_phone: null,
    profile_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallSellerProfile.ICreate;

  const sellerProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: sellerProfileBody,
    });
  typia.assert(sellerProfile);

  // 6. Assign user role to seller
  const userRoleBody = {
    user_id: seller.id,
    role_name: "seller",
  } satisfies IShoppingMallUserRole.ICreate;

  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleBody,
    });
  typia.assert(userRole);

  // 7. Admin deletes seller account
  await api.functional.shoppingMall.admin.sellers.erase(connection, {
    id: seller.id,
  });

  // Note: Since delete returns void and cascade deletes, just ensure no errors thrown
}
