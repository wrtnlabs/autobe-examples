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

export async function test_api_sellers_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user sign-up
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const adminUser: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminUser);

  // Step 2: Admin login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "http://localhost/login",
    referrer: "http://localhost/",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // Step 3: Seller user sign-up
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "sellerPass123",
    store_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
  } satisfies IShoppingMallSeller.ICreate;

  const sellerUser: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerUser);

  // Step 4: Assign user role for seller by admin
  const userRoleCreateBody = {
    user_id: sellerUser.id,
    role_name: "seller",
  } satisfies IShoppingMallUserRole.ICreate;

  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleCreateBody,
    });
  typia.assert(userRole);

  // Step 5: Create seller profile linked to seller user
  const nowIso = new Date().toISOString();
  const sellerProfileCreateBody = {
    shopping_mall_seller_id: sellerUser.id,
    store_name: sellerJoinBody.store_name,
    contact_email: sellerJoinBody.email,
    business_registration_number: null,
    contact_phone: null,
    profile_description: null,
    created_at: nowIso,
    updated_at: nowIso,
    deleted_at: null,
  } satisfies IShoppingMallSellerProfile.ICreate;

  const sellerProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: sellerProfileCreateBody,
    });
  typia.assert(sellerProfile);

  // Step 6: Admin updates seller user profile
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedStoreName = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 5,
    wordMax: 9,
  });
  const sellerUpdateBody = {
    email: updatedEmail,
    store_name: updatedStoreName,
  } satisfies IShoppingMallSeller.IUpdate;

  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      id: sellerUser.id,
      body: sellerUpdateBody,
    });
  typia.assert(updatedSeller);

  // Step 7: Validate updates
  TestValidator.equals(
    "Updated seller email",
    updatedSeller.email,
    updatedEmail,
  );
  TestValidator.equals(
    "Updated store name",
    updatedSeller.store_name,
    updatedStoreName,
  );
  TestValidator.equals("Seller ID unchanged", updatedSeller.id, sellerUser.id);

  if (updatedSeller.shopping_mall_seller_profiles) {
    TestValidator.equals(
      "Seller profile linked store name",
      updatedSeller.shopping_mall_seller_profiles.store_name,
      updatedStoreName,
    );
  }

  // Step 8: Test unauthorized update attempt by seller (should fail)
  // Seller login
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "http://localhost/login",
    referrer: "http://localhost/",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogin);

  await TestValidator.error(
    "Unauthorized seller cannot update another seller",
    async () => {
      await api.functional.shoppingMall.admin.sellers.update(connection, {
        id: updatedSeller.id,
        body: {
          store_name: "Hacker Store",
        } satisfies IShoppingMallSeller.IUpdate,
      });
    },
  );
}
