import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Admin retrieves complete seller profile details for an active seller account.
 *
 * Validates the administrator's ability to access and verify seller profile information through the profile retrieval endpoint. Ensures that registered sellers have their business profiles properly created and accessible, including validation of all profile fields such as shop name, description, branding assets, and account relationship data.
 *
 * Special attention is given to confirming that the seller relationship is correctly populated within the profile response, allowing administrators to perform due diligence and management operations on platform merchants.
 *
 * 1. Admin registers for platform management access.
 * 2. Seller registers account which auto-creates associated seller profile.
 * 3. Admin retrieves complete seller profile using seller ID and profile ID.
 * 4. Validates profile contains all expected fields and seller relationship.
 */
export async function test_api_seller_profile_admin_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin-seller-profile-retrieve@ecommerce.test.com",
      password: "AdminPassword123!",
    },
  });
  // 2. Seller registration (auto-creates profile)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: "shop-merchandise-vendor@ecommerce.test.com",
      password: "SellerSecure789!",
    },
  });
  const sellerId = sellerAuthorized.id;
  // Profile is auto-created during seller registration
  // Using seller ID as profile ID reference for 1:1 relationship
  const profileId = sellerAuthorized.id;
  // 3. Admin retrieves seller profile
  const profile =
    await api.functional.ecommercePlatform.admin.sellers.profiles.at(
      adminConnection,
      {
        sellerId,
        profileId,
      },
    );
  typia.assert(profile);
  // 4. Validate core profile fields exist
  TestValidator.predicate("profile id is valid", () => profile.id.length > 0);
  TestValidator.equals(
    "seller id matches profile owner",
    profile.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "shop name is string type",
    typeof profile.shopName,
    "string",
  );
  TestValidator.equals(
    "shop description is string type",
    typeof profile.shopDescription,
    "string",
  );
  TestValidator.equals(
    "logo uri is string type",
    typeof profile.logoImageUri,
    "string",
  );
  TestValidator.predicate(
    "created at timestamp exists",
    () => profile.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    () => profile.updatedAt.length > 0,
  );
  // 5. Validate seller relationship in profile
  TestValidator.equals(
    "seller email matches registration",
    profile.seller.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "seller has approval status",
    typeof profile.seller.approvalStatus,
    "string",
  );
  TestValidator.equals(
    "seller is not banned by default",
    profile.seller.isBanned,
    false,
  );
  TestValidator.equals(
    "seller profile relation exists",
    profile.seller.sellerProfile !== undefined,
    true,
  );
  // 6. Validate active profile state (not soft-deleted)
  TestValidator.equals(
    "profile is active (not deleted)",
    profile.deletedAt,
    null,
  );
}
