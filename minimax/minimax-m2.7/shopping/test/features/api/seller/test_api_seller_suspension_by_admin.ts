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
import { generate_random_ecommerce_mall_admin_admin_sellers_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_admin_sellers_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

/**
 * Test successful suspension of an approved seller account by an administrator.
 *
 * Validates the complete seller suspension workflow including seller registration,
 * administrator approval, and the suspension operation itself. This test ensures
 * that administrators can properly suspend approved seller accounts and that the
 * suspension record contains accurate audit information.
 *
 * **Workflow:**
 * 1. Create a new seller account with pending approval status
 * 2. Create an administrator account with full privileges
 * 3. Administrator approves the pending seller registration
 * 4. Administrator suspends the approved seller with a reason
 * 5. Validate suspension record contains seller details, admin info, reason, and timestamp
 *
 * **Expected Results:**
 * - Seller approval status changes from "pending" to "approved"
 * - Suspension response contains complete seller information
 * - Suspension response contains suspending administrator details
 * - Reason field matches the input provided
 * - Timestamp is automatically generated server-side
 */
export async function test_api_seller_suspension_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account (starts with pending status)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 3. Administrator approves the pending seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      {
        sellerId: sellerAuth.id,
      },
    );
  typia.assert(approvedSeller);
  // Validate seller is now approved
  TestValidator.equals(
    "seller approval status is approved",
    approvedSeller.approvalStatus,
    "approved",
  );
  // 4. Administrator suspends the approved seller
  const suspensionReason = RandomGenerator.paragraph({ sentences: 2 });
  const suspension =
    await api.functional.ecommerceMall.admin.admin.sellers.suspend(
      adminConnection,
      {
        sellerId: approvedSeller.id,
        body: {
          reason: suspensionReason,
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 5. Validate suspension record
  TestValidator.equals(
    "suspension reason matches input",
    suspension.reason,
    suspensionReason,
  );
  TestValidator.predicate(
    "suspendedAt timestamp exists",
    suspension.suspendedAt.length > 0,
  );
  TestValidator.equals(
    "seller ID matches",
    suspension.seller.id,
    approvedSeller.id,
  );
  TestValidator.equals(
    "seller email matches",
    suspension.seller.email,
    approvedSeller.email,
  );
  TestValidator.equals(
    "suspended by admin ID matches",
    suspension.suspendedBy.id,
    adminAuth.id,
  );
  TestValidator.predicate(
    "restoredAt is null (still suspended)",
    suspension.restoredAt === null,
  );
}
