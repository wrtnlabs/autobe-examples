import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerApproval";
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
 * Test filtering seller approvals by status (pending only).
 *
 * Validates the seller approval listing endpoint correctly filters by status parameter.
 * When an administrator queries seller approvals with status='pending', only records
 * with pending approval status are returned. This test verifies:
 *
 * 1. Admin authentication and access to the approval listing endpoint
 * 2. Creation of multiple seller registrations that start with pending status
 * 3. Filtering behavior - only pending records are returned when status='pending'
 * 4. Pagination metadata accuracy for filtered results
 * 5. Response structure compliance with IPageIEcommerceMallSellerApproval.ISummary
 *
 * The test ensures administrators can efficiently view pending seller approvals awaiting
 * their review, which is critical for the seller onboarding workflow.
 */
export async function test_api_seller_approval_filter_by_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create multiple sellers (all will have pending status)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {});
  typia.assert(seller1);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {});
  typia.assert(seller2);
  // 3. Query seller approvals with status='pending' filter
  const pendingApprovals =
    await api.functional.ecommerceMall.admin.admin.seller_approvals.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallSellerApproval.IRequest,
      },
    );
  typia.assert(pendingApprovals);
  // 4. Validate all returned records have status='pending'
  for (const approval of pendingApprovals.data) {
    TestValidator.equals(
      "approval status is pending",
      approval.status,
      "pending",
    );
  }
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "has valid pagination",
    pendingApprovals.pagination.records >= 2,
  );
  TestValidator.predicate(
    "has valid page info",
    pendingApprovals.pagination.pages >= 1,
  );
  // 6. Verify the pending sellers are in the results
  const pendingSellerIds = pendingApprovals.data.map((a) => a.seller.id);
  TestValidator.equals(
    "first seller in pending approvals",
    pendingSellerIds.includes(seller1.id),
    true,
  );
  TestValidator.equals(
    "second seller in pending approvals",
    pendingSellerIds.includes(seller2.id),
    true,
  );
}
