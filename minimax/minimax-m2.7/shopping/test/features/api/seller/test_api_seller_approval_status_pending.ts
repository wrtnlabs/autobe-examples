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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test verifying that a newly registered seller sees 'pending' approval status.
 *
 * Validates the complete workflow for newly registered sellers including:
 * - Registration creates a seller account with pending approval status
 * - The approval status endpoint returns the correct pending status
 * - Rejection reason and timestamp are null for pending sellers
 * - Approval history contains the initial registration record
 *
 * 1. Register new seller account via POST /ecommerceMall/auth/seller/join
 * 2. Call GET /ecommerceMall/seller/seller/approval-status as authenticated seller
 * 3. Verify approvalStatus equals 'pending'
 * 4. Verify rejectionReason is null
 * 5. Verify rejectedAt is null
 * 6. Verify approvalHistory contains at least one record
 */
export async function test_api_seller_approval_status_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {});
  // 2. Get approval status as authenticated seller
  const approvalStatus =
    await api.functional.ecommerceMall.seller.seller.approval_status.at(
      sellerConnection,
    );
  typia.assert(approvalStatus);
  // 3. Verify approvalStatus is 'pending'
  TestValidator.equals(
    "approval status should be pending",
    approvalStatus.approvalStatus,
    "pending",
  );
  // 4. Verify rejectionReason is null for pending seller
  TestValidator.equals(
    "rejection reason should be null",
    approvalStatus.rejectionReason,
    null,
  );
  // 5. Verify rejectedAt is null for pending seller
  TestValidator.equals(
    "rejected at should be null",
    approvalStatus.rejectedAt,
    null,
  );
  // 6. Verify approvalHistory contains the initial registration record
  TestValidator.predicate(
    "approval history should not be empty",
    approvalStatus.approvalHistory.length > 0,
  );
  TestValidator.equals(
    "first approval history status should be pending",
    approvalStatus.approvalHistory[0].status,
    "pending",
  );
}
