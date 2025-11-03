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

export async function test_api_seller_profile_creation(
  connection: api.IConnection,
) {
  // 1. Admin joins the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "admin_password!23",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // 2. Admin logs in
  const adminLoginBody = {
    email: adminEmail,
    password: "admin_password!23",
    ip: null,
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);
  TestValidator.equals(
    "admin logged in email matches",
    adminLoggedIn.email,
    adminEmail,
  );

  // 3. Seller joins the system
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "seller_password!23",
    store_name: RandomGenerator.name(2),
  } satisfies IShoppingMallSeller.ICreate;
  const sellerJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerJoined);
  TestValidator.equals("seller email matches", sellerJoined.email, sellerEmail);

  // 4. Seller logs in
  const sellerLoginBody = {
    email: sellerEmail,
    password: "seller_password!23",
    ip: null,
    href: "https://seller.example.com/dashboard",
    referrer: "https://seller.example.com/login",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);
  TestValidator.equals(
    "seller logged in email matches",
    sellerLoggedIn.email,
    sellerEmail,
  );

  // 5. Admin assigns seller role
  const userRoleCreateBody = {
    user_id: sellerJoined.id,
    role_name: "seller",
  } satisfies IShoppingMallUserRole.ICreate;
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleCreateBody,
    });
  typia.assert(userRole);
  TestValidator.equals(
    "user role user_id matches",
    userRole.user_id,
    sellerJoined.id,
  );
  TestValidator.equals(
    "user role name equals seller",
    userRole.role_name,
    "seller",
  );

  // 6. Seller creates profile
  const sellerProfileCreateBody = {
    shopping_mall_seller_id: sellerJoined.id,
    store_name: sellerJoinBody.store_name,
    business_registration_number: null,
    contact_email: sellerEmail,
    contact_phone: null,
    profile_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IShoppingMallSellerProfile.ICreate;

  const createdProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: sellerProfileCreateBody,
    });
  typia.assert(createdProfile);

  TestValidator.equals(
    "profile seller id matches",
    createdProfile.shopping_mall_seller_id,
    sellerJoined.id,
  );
  TestValidator.equals(
    "profile store name matches",
    createdProfile.store_name,
    sellerJoinBody.store_name,
  );
  TestValidator.equals(
    "profile contact email matches",
    createdProfile.contact_email,
    sellerEmail,
  );
}
