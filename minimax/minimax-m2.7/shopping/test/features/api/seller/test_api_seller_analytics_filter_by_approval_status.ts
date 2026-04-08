import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering seller analytics by approval status.
 *
 * Validates the superAdmin analytics endpoint correctly filters sellers by their approval status (pending, approved, rejected). For each approval status value, verifies that:
 * - The response pagination structure is valid
 * - All returned sellers have the matching approvalStatus field
 * - The filtering logic correctly separates sellers by their approval state
 *
 * 1. Authenticate as superAdmin using authorize_super_admin_join utility function
 * 2. Call analytics endpoint with approvalStatus='approved', verify all results have approvalStatus='approved'
 * 3. Call analytics endpoint with approvalStatus='pending', verify all results have approvalStatus='pending'
 * 4. Call analytics endpoint with approvalStatus='rejected', verify all results have approvalStatus='rejected'
 * 5. For each response, validate pagination metadata (current, limit, records, pages)
 */
export async function test_api_seller_analytics_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test filtering by 'approved' status
  const approvedResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.sellers.index(
      superAdminConnection,
      {
        body: {
          approvalStatus: "approved",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(approvedResponse);
  TestValidator.equals(
    "pagination exists",
    approvedResponse.pagination !== null,
    true,
  );
  TestValidator.predicate("approved sellers have correct status", () => {
    for (const seller of approvedResponse.data) {
      if (seller.approvalStatus !== "approved") {
        return false;
      }
    }
    return true;
  });
  // 3. Test filtering by 'pending' status
  const pendingResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.sellers.index(
      superAdminConnection,
      {
        body: {
          approvalStatus: "pending",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(pendingResponse);
  TestValidator.equals(
    "pagination exists",
    pendingResponse.pagination !== null,
    true,
  );
  TestValidator.predicate("pending sellers have correct status", () => {
    for (const seller of pendingResponse.data) {
      if (seller.approvalStatus !== "pending") {
        return false;
      }
    }
    return true;
  });
  // 4. Test filtering by 'rejected' status
  const rejectedResponse =
    await api.functional.ecommerceMall.superAdmin.admin.analytics.sellers.index(
      superAdminConnection,
      {
        body: {
          approvalStatus: "rejected",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMallSeller.IAnalytic.IRequest,
      },
    );
  typia.assert(rejectedResponse);
  TestValidator.equals(
    "pagination exists",
    rejectedResponse.pagination !== null,
    true,
  );
  TestValidator.predicate("rejected sellers have correct status", () => {
    for (const seller of rejectedResponse.data) {
      if (seller.approvalStatus !== "rejected") {
        return false;
      }
    }
    return true;
  });
}
