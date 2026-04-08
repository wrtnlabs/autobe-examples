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

export async function test_api_suspended_seller_details_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: seller.id },
    );
  typia.assert(approvedSeller);
  // 4. Admin retrieves seller details
  const sellerDetails =
    await api.functional.ecommerceMall.admin.admin.sellers.at(adminConnection, {
      sellerId: approvedSeller.id,
    });
  typia.assert(sellerDetails);
  // 5. Validate response includes seller identification
  TestValidator.equals(
    "seller email present",
    sellerDetails.email,
    approvedSeller.email,
  );
  TestValidator.equals(
    "seller id matches",
    sellerDetails.id,
    approvedSeller.id,
  );
  // 6. Validate approvalStatus is 'approved'
  TestValidator.equals(
    "approvalStatus is approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 7. Validate sellerSuspensions array exists and is properly structured
  TestValidator.predicate(
    "sellerSuspensions is array",
    Array.isArray(sellerDetails.sellerSuspensions),
  );
  // 8. Validate sellerApprovals array contains approval record
  TestValidator.predicate(
    "sellerApprovals is array",
    Array.isArray(sellerDetails.sellerApprovals),
  );
  TestValidator.predicate(
    "has at least one approval record",
    sellerDetails.sellerApprovals.length > 0,
  );
  // 9. Find the approval record with 'approved' status
  const approvedApproval = sellerDetails.sellerApprovals.find(
    (a) => a.status === "approved",
  );
  TestValidator.equals(
    "approved approval record exists",
    approvedApproval !== undefined,
    true,
  );
  // 10. Validate approval record has required fields
  TestValidator.predicate(
    "approval has valid timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(approvedApproval!.created_at),
  );
  TestValidator.equals(
    "approval reviewed by admin exists",
    approvedApproval!.reviewedByAdmin !== null,
    true,
  );
  // 11. Validate profile information is included
  TestValidator.predicate(
    "profile exists",
    sellerDetails.profile !== null && sellerDetails.profile !== undefined,
  );
  // 12. Validate profile contains seller summary
  TestValidator.equals(
    "profile seller email matches",
    sellerDetails.profile.seller.email,
    approvedSeller.email,
  );
}
