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
 * Test that an administrator can successfully retrieve a seller profile when the seller has 'approved' status.
 *
 * Validates the complete workflow of admin viewing an approved seller's profile. First, registers an administrator account, then registers a seller account (which starts with 'pending' approval status), and has the admin approve the seller registration. Finally, the admin retrieves the approved seller's public profile to verify the data structure.
 *
 * This test ensures:
 * - The GET /ecommerceMall/admin/sellers/{sellerId} endpoint returns correct seller profile data
 * - The approvalStatus is 'approved' after successful seller approval
 * - The sellerProfile contains all required fields: id, name, description, logoUri, createdAt, updatedAt
 * - Sensitive fields like email and password_hash are NOT exposed in the response (using IInvert type)
 * - The response matches the IEcommerceMallSeller.IInvert type structure
 *
 * 1. Register administrator account with email and password.
 * 2. Register seller account (starts with 'pending' status).
 * 3. Admin approves the seller registration.
 * 4. Admin retrieves the approved seller's profile by sellerId.
 * 5. Validate response contains: seller id, approvalStatus='approved', sellerProfile with name, description, logoUri, and timestamps.
 * 6. Verify sensitive fields like email and password_hash are NOT included in the response.
 */
export async function test_api_seller_profile_view_by_admin_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Register seller account (starts with 'pending' status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Store seller ID for later use
  const sellerId = seller.id;
  // 3. Admin approves the seller registration
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: sellerId,
      },
    );
  typia.assert(approvedSeller);
  // Verify seller is now approved
  TestValidator.equals(
    "approval status is approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Admin retrieves the approved seller's profile by sellerId
  const sellerProfile = await api.functional.ecommerceMall.admin.sellers.at(
    adminConnection,
    {
      sellerId: sellerId,
    },
  );
  typia.assert(sellerProfile);
  // 5. Validate response structure - use IInvert type for validation
  TestValidator.equals("seller id matches", sellerProfile.id, sellerId);
  TestValidator.equals(
    "approvalStatus is approved",
    sellerProfile.approvalStatus,
    "approved",
  );
  TestValidator.predicate(
    "sellerProfile exists",
    sellerProfile.sellerProfile !== null &&
      sellerProfile.sellerProfile !== undefined,
  );
  TestValidator.equals(
    "sellerProfile has name",
    sellerProfile.sellerProfile.name,
    approvedSeller.profile.name,
  );
  TestValidator.equals(
    "sellerProfile has description",
    sellerProfile.sellerProfile.description,
    approvedSeller.profile.description,
  );
  TestValidator.equals(
    "createdAt exists",
    typeof sellerProfile.createdAt,
    "string",
  );
  TestValidator.equals(
    "updatedAt exists",
    typeof sellerProfile.updatedAt,
    "string",
  );
  // 6. Verify the response type is IInvert - ensure email and password_hash are NOT in the response
  // The IInvert type does not include email, password_hash, or other sensitive fields
  const profileKeys = Object.keys(sellerProfile);
  TestValidator.equals(
    "email not in response",
    profileKeys.includes("email"),
    false,
  );
  TestValidator.equals(
    "password_hash not in response",
    profileKeys.includes("password_hash"),
    false,
  );
  TestValidator.equals(
    "rejectionReason not in response",
    profileKeys.includes("rejectionReason"),
    false,
  );
}
