import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
 * Test retrieving a specific seller profile by its unique identifier as an authenticated administrator.
 *
 * Validates the complete workflow of an administrator viewing seller profile details on the e-commerce platform. This test ensures that authorized administrators can successfully access any seller profile information including shop name, business description, logo URI, timestamps, and associated seller account details.
 *
 * The test flow involves:
 * 1. Administrator registration and authentication via admin join endpoint
 * 2. Seller registration to create a profile that can be retrieved
 * 3. Administrator retrieving the seller profile by ID
 * 4. Validation that all profile fields are correctly returned including nested seller information
 *
 * This test validates that administrators have full visibility into seller shop profiles for oversight and compliance purposes.
 */
export async function test_api_seller_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Get seller profile ID from the seller authorization response
  const sellerProfileId = seller.profile.id;
  // 4. Admin retrieves the seller profile
  const sellerProfile =
    await api.functional.ecommerceMall.admin.admin.seller_profiles.at(
      adminConnection,
      {
        sellerProfileId: sellerProfileId,
      },
    );
  typia.assert(sellerProfile);
  // 5. Validate response fields
  TestValidator.equals("profile id matches", sellerProfile.id, sellerProfileId);
  TestValidator.equals("name matches", sellerProfile.name, seller.profile.name);
  TestValidator.equals(
    "description is string",
    typeof sellerProfile.description,
    "string",
  );
  TestValidator.equals(
    "created_at is valid",
    typeof sellerProfile.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is valid",
    typeof sellerProfile.updated_at,
    "string",
  );
  TestValidator.equals("deleted_at is null", sellerProfile.deleted_at, null);
  TestValidator.predicate("seller object exists", !!sellerProfile.seller);
  TestValidator.equals("seller id matches", sellerProfile.seller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    sellerProfile.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "seller approvalStatus is pending",
    sellerProfile.seller.approvalStatus,
    "pending",
  );
  TestValidator.equals(
    "seller suspensionStatus is active",
    sellerProfile.seller.suspensionStatus,
    "active",
  );
}
