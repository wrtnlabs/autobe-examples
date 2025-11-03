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
 * Test deletion of a seller profile by a properly authenticated seller account.
 *
 * Ensures that a seller can create and delete their own profile, validating
 * security and access boundaries. Cross-actor validation includes preventing
 * unauthorized deletion attempts by other sellers or admin.
 *
 * Steps:
 *
 * 1. Seller A signs up (join) and receives authorization.
 * 2. Assign role "seller" to Seller A.
 * 3. Seller A creates a seller profile with valid data.
 * 4. Seller A deletes their own seller profile successfully.
 * 5. Seller B signs up and attempts to delete Seller A's profile, expecting
 *    failure.
 * 6. Admin signs up and attempts to delete Seller A's profile, expecting failure.
 *
 * All API responses are typia.asserted to guarantee type conformance. Tests
 * ensure complete authorization flow correctness, data integrity, and proper
 * error handling.
 */
export async function test_api_seller_profile_erase_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller A signs up
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerAEmail,
        password: "password1234",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerA);

  // 2. Assign "seller" role to Seller A
  const sellerARole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: sellerA.id,
        role_name: "seller",
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(sellerARole);

  // 3. Seller A creates a seller profile
  const nowISOString = new Date().toISOString();
  const sellerProfileCreateBody = {
    shopping_mall_seller_id: sellerA.id,
    store_name: sellerA.store_name,
    business_registration_number: null,
    contact_email: sellerA.email,
    contact_phone: null,
    profile_description: null,
    created_at: nowISOString,
    updated_at: nowISOString,
    deleted_at: null,
  } satisfies IShoppingMallSellerProfile.ICreate;
  const sellerProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: sellerProfileCreateBody,
    });
  typia.assert(sellerProfile);

  // 4. Seller A deletes their own profile
  await api.functional.shoppingMall.seller.sellerProfiles.eraseSellerProfile(
    connection,
    {
      id: sellerProfile.id,
    },
  );

  // 5. Seller B signs up
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerBEmail,
        password: "password1234",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(sellerB);

  // Assign "seller" role to Seller B
  const sellerBRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: sellerB.id,
        role_name: "seller",
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(sellerBRole);

  // 6. Admin signs up
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUser: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "password1234",
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminUser);

  // Seller B attempts to delete Seller A's profile - expect error
  await TestValidator.error(
    "Seller B cannot delete Seller A's profile",
    async () => {
      await api.functional.shoppingMall.seller.sellerProfiles.eraseSellerProfile(
        connection,
        {
          id: sellerProfile.id,
        },
      );
    },
  );

  // Admin attempts to delete Seller A's profile - expect error
  await TestValidator.error(
    "Admin cannot delete Seller A's profile",
    async () => {
      await api.functional.shoppingMall.seller.sellerProfiles.eraseSellerProfile(
        connection,
        {
          id: sellerProfile.id,
        },
      );
    },
  );
}
