import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

/**
 * This test confirms that an admin can successfully retrieve detailed seller
 * account information by seller ID.
 *
 * The test proceeds as follows:
 *
 * 1. Registers a new admin user and stores the admin's authorized info and token.
 * 2. Creates a seller profile for an existing seller ID.
 * 3. Assigns necessary admin user roles for access control.
 * 4. Uses the admin account to fetch the seller account details by seller ID.
 * 5. Validates that the returned seller summary data matches expected fields and
 *    the seller profile.
 *
 * All operations use strictly typed request bodies and validate responses
 * thoroughly.
 */
export async function test_api_admin_seller_account_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin user registration
  const adminJoinBody: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassw0rd!",
    full_name: RandomGenerator.name(),
  };

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a seller profile with an existing seller ID (simulate one if necessary)
  // We assume the seller ID is needed; typia.random for seller ID (UUID format)

  // For the test, create a realistic seller ID
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const sellerProfileBody: IShoppingMallSellerProfile.ICreate = {
    shopping_mall_seller_id: sellerId,
    store_name: RandomGenerator.name(),
    contact_email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: null,
    contact_phone: null,
    profile_description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  const sellerProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: sellerProfileBody,
    });
  typia.assert(sellerProfile);

  // 3. Assign admin user roles for access control, using the admin's user ID
  // The user ID of admin must be used; but it's not explicitly provided in IShoppingMallAdmin.IAuthorized
  // We know IShoppingMallAdmin.IAuthorized.id as UUID

  const userRoleBody: IShoppingMallUserRole.ICreate = {
    user_id: adminAuthorized.id,
    role_name: "admin",
  };

  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleBody,
    });
  typia.assert(userRole);

  // 4. Admin fetches seller details by seller ID
  const sellerSummary: IShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      id: sellerId,
    });
  typia.assert(sellerSummary);

  // 5. Validate key fields
  TestValidator.equals("Seller ID matches", sellerSummary.id, sellerId);
  TestValidator.predicate(
    "Seller email valid",
    typeof sellerSummary.email === "string" && sellerSummary.email.length > 0,
  );
  TestValidator.predicate(
    "Seller store name matches profile",
    sellerSummary.store_name === sellerProfile.store_name,
  );
  TestValidator.predicate(
    "Seller created_at is valid ISO string",
    typeof sellerSummary.created_at === "string" &&
      sellerSummary.created_at.length > 0,
  );
  TestValidator.predicate(
    "Seller updated_at is valid ISO string",
    typeof sellerSummary.updated_at === "string" &&
      sellerSummary.updated_at.length > 0,
  );
  TestValidator.predicate(
    "Seller is_active is boolean",
    typeof sellerSummary.is_active === "boolean",
  );

  if (sellerSummary.profile !== undefined) {
    TestValidator.equals(
      "Seller profile contact email matches",
      sellerSummary.profile.contact_email,
      sellerProfile.contact_email,
    );

    if (
      sellerSummary.profile.business_registration_number !== undefined &&
      sellerProfile.business_registration_number !== null
    ) {
      TestValidator.equals(
        "Business registration number matches",
        sellerSummary.profile.business_registration_number,
        sellerProfile.business_registration_number,
      );
    }
  }
}
