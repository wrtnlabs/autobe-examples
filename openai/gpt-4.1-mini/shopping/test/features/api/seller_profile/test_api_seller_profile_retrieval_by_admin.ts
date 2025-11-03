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
 * Validate retrieval of a detailed seller profile by an admin user.
 *
 * This test performs the following steps:
 *
 * 1. Register an admin user and log in.
 * 2. Assign the 'admin' role to the admin user.
 * 3. Register a seller user and log in.
 * 4. Create a new seller profile linked to the seller account.
 * 5. As admin, retrieve the seller profile by its unique ID.
 * 6. Validate the retrieved profile matches the created profile.
 */
export async function test_api_seller_profile_retrieval_by_admin(
  connection: api.IConnection,
) {
  // -- Admin registration --
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Password123!",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // -- Admin login --
  const adminLoginBody = {
    email: adminEmail,
    password: "Password123!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuth);

  // -- Assign admin role to admin user --
  const adminUserRoleBody = {
    user_id: adminAuth.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;

  const adminRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: adminUserRoleBody,
    });
  typia.assert(adminRole);

  // -- Seller registration --
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Password123!",
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // -- Seller login --
  const sellerLoginBody = {
    email: sellerEmail,
    password: "Password123!",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuth);

  // -- Create seller profile linked to seller account --
  const newSellerProfileBody = {
    shopping_mall_seller_id: sellerAuth.id,
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
      body: newSellerProfileBody,
    });
  typia.assert(createdProfile);

  // -- As admin, retrieve the seller profile by ID --
  const retrievedProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.admin.sellerProfiles.at(connection, {
      id: createdProfile.id,
    });
  typia.assert(retrievedProfile);

  // -- Validate the retrieved profile data --
  TestValidator.equals(
    "retrieved profile id",
    retrievedProfile.id,
    createdProfile.id,
  );
  TestValidator.equals(
    "retrieved profile seller id",
    retrievedProfile.shopping_mall_seller_id,
    createdProfile.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "retrieved profile store name",
    retrievedProfile.store_name,
    createdProfile.store_name,
  );
  TestValidator.equals(
    "retrieved profile business registration number",
    retrievedProfile.business_registration_number,
    createdProfile.business_registration_number,
  );
  TestValidator.equals(
    "retrieved profile contact email",
    retrievedProfile.contact_email,
    createdProfile.contact_email,
  );
  TestValidator.equals(
    "retrieved profile contact phone",
    retrievedProfile.contact_phone,
    createdProfile.contact_phone,
  );
  TestValidator.equals(
    "retrieved profile description",
    retrievedProfile.profile_description,
    createdProfile.profile_description,
  );
  TestValidator.predicate(
    "retrieved profile created at is ISO string",
    !!retrievedProfile.created_at.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    ),
  );
  TestValidator.predicate(
    "retrieved profile updated at is ISO string",
    !!retrievedProfile.updated_at.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    ),
  );
}
