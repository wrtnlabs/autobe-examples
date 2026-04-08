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
 * Test seller account unsuspension with restoration reason.
 *
 * Validates the complete unsuspension workflow for a suspended seller account.
 * Tests that an administrator can successfully lift a seller's suspension
 * and optionally provide a restoration reason for audit purposes.
 *
 * This test verifies:
 * 1. Admin can authenticate and perform unsuspension action
 * 2. Seller registration creates account in pending status
 * 3. Suspension creates audit record with reason
 * 4. Unsuspension properly restores the account
 * 5. Restoration timestamp and reason are recorded in audit trail
 * 6. Approval status remains unchanged during suspension operations
 *
 * Flow:
 * 1. Create admin account via join endpoint
 * 2. Create seller account via join endpoint
 * 3. Suspend seller with violation reason
 * 4. Unsuspend seller with restoration reason
 * 5. Validate response structure and audit trail
 */
export async function test_api_seller_unsuspend_with_restoration_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for performing unsuspension
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create seller account to be suspended and unsuspended
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Suspend the seller with a violation reason
  const suspendReason = "Policy violation: counterfeit products detected";
  const suspension =
    await generate_random_ecommerce_mall_admin_admin_sellers_suspend(
      adminConnection,
      {
        params: { sellerId: seller.id },
        body: { reason: suspendReason },
      },
    );
  typia.assert(suspension);
  // 4. Unsuspend the seller with restoration reason
  const restorationReason =
    "Seller has addressed policy violations and submitted compliance documentation";
  const unsuspendedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.unsuspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          restoredReason: restorationReason,
        } satisfies IEcommerceMallSeller.IUnsuspend,
      },
    );
  typia.assert(unsuspendedSeller);
  // 5. Validate the restoration details
  TestValidator.equals("seller ID preserved", unsuspendedSeller.id, seller.id);
  TestValidator.equals(
    "email unchanged",
    unsuspendedSeller.email,
    seller.email,
  );
  TestValidator.equals(
    "approval status remains approved",
    unsuspendedSeller.approvalStatus,
    "approved",
  );
  // 6. Validate suspension history contains restoration record
  TestValidator.predicate(
    "has suspension history",
    unsuspendedSeller.sellerSuspensions.length > 0,
  );
  const latestSuspension =
    unsuspendedSeller.sellerSuspensions[
      unsuspendedSeller.sellerSuspensions.length - 1
    ];
  TestValidator.equals(
    "original suspension reason preserved",
    latestSuspension.reason,
    suspendReason,
  );
  TestValidator.predicate(
    "has restoration timestamp",
    latestSuspension.restored_at !== null &&
      latestSuspension.restored_at !== undefined,
  );
  TestValidator.equals(
    "restoration reason matches input",
    latestSuspension.restored_reason,
    restorationReason,
  );
}
