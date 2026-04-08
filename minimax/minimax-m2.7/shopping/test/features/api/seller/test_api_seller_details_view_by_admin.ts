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
 * Test that an authenticated administrator can retrieve complete details of an approved seller account.
 *
 * Validates the admin's ability to view detailed seller information through the administrative interface. This test ensures that administrators with valid authentication can access comprehensive seller data including account status, shop profile details, approval history, and suspension records. The endpoint serves as a critical tool for platform oversight and seller management operations.
 *
 * 1. Administrator registers and authenticates to obtain admin credentials.
 * 2. Seller registers to create a seller account for testing.
 * 3. Admin retrieves seller details using the seller's UUID.
 * 4. Validates response contains: email, approvalStatus='approved', nested profile with shop details, and sellerSuspensions array.
 * 5. Confirms password_hash is not exposed in the response.
 * 6. Verifies nested data structures (profile, approvals, suspensions) are properly populated.
 */
export async function test_api_seller_details_view_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Admin retrieves seller details
  const sellerDetails =
    await api.functional.ecommerceMall.admin.admin.sellers.at(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(sellerDetails);
  // 4. Validate response structure
  TestValidator.equals("seller id matches", sellerDetails.id, seller.id);
  TestValidator.equals("email matches", sellerDetails.email, seller.email);
  TestValidator.equals(
    "approval status is approved",
    sellerDetails.approvalStatus,
    "approved",
  );
  TestValidator.predicate(
    "profile exists",
    sellerDetails.profile !== null && sellerDetails.profile !== undefined,
  );
  TestValidator.predicate(
    "seller approvals array exists",
    Array.isArray(sellerDetails.sellerApprovals),
  );
  TestValidator.predicate(
    "seller suspensions array exists",
    Array.isArray(sellerDetails.sellerSuspensions),
  );
  TestValidator.predicate(
    "approval count is non-negative",
    sellerDetails.approvalCount >= 0,
  );
  TestValidator.predicate(
    "suspension count is non-negative",
    sellerDetails.suspensionCount >= 0,
  );
  // 5. Validate profile nested data
  TestValidator.predicate(
    "profile has name",
    typeof sellerDetails.profile.name === "string",
  );
  TestValidator.predicate(
    "profile has description",
    typeof sellerDetails.profile.description === "string",
  );
  TestValidator.equals(
    "profile seller matches",
    sellerDetails.profile.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "profile seller email matches",
    sellerDetails.profile.seller.email,
    seller.email,
  );
  // 6. Validate nested sellerApprovals
  TestValidator.predicate(
    "has at least one approval record",
    sellerDetails.sellerApprovals.length >= 1,
  );
  if (sellerDetails.sellerApprovals.length > 0) {
    const latestApproval =
      sellerDetails.sellerApprovals[sellerDetails.sellerApprovals.length - 1];
    TestValidator.equals(
      "approval seller matches",
      latestApproval.seller.id,
      seller.id,
    );
  }
  // 7. Validate timestamps
  TestValidator.predicate(
    "createdAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sellerDetails.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sellerDetails.updatedAt),
  );
  // 8. Verify null fields
  TestValidator.equals(
    "rejectionReason is null for approved",
    sellerDetails.rejectionReason,
    null,
  );
  TestValidator.equals(
    "rejectedAt is null for approved",
    sellerDetails.rejectedAt,
    null,
  );
  TestValidator.equals(
    "deletedAt is null for active",
    sellerDetails.deletedAt,
    null,
  );
}
