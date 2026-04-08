import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering seller list by approval status to verify administrators can focus on specific approval workflow stages.
 *
 * Validates the complete approval status filtering capability including pending, approved, and rejected seller filtering. Ensures that each status filter returns only sellers with matching approval status and that pagination metadata accurately reflects the filtered result count.
 *
 * Special attention is given to verifying that rejected sellers have non-null rejectionReason fields and that no sellers with mismatched approval status appear in filtered results.
 *
 * 1. Administrator account created and authenticated via authorize_admin_join utility function.
 * 2. Filter sellers by 'pending' status and validate all results have matching approvalStatus.
 * 3. Filter sellers by 'approved' status and validate all results have matching approvalStatus.
 * 4. Filter sellers by 'rejected' status and validate all results have matching approvalStatus with non-null rejectionReason.
 * 5. Verify pagination metadata records count matches actual data length for each filtered result.
 */
export async function test_api_seller_list_approval_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test pending status filter
  const pendingResult = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approvalStatus: "pending",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(pendingResult);
  // Validate all pending sellers have correct status
  for (const seller of pendingResult.data) {
    TestValidator.equals(
      "pending seller status",
      seller.approvalStatus,
      "pending",
    );
  }
  // 3. Test approved status filter
  const approvedResult = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approvalStatus: "approved",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(approvedResult);
  // Validate all approved sellers have correct status
  for (const seller of approvedResult.data) {
    TestValidator.equals(
      "approved seller status",
      seller.approvalStatus,
      "approved",
    );
  }
  // 4. Test rejected status filter
  const rejectedResult = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    {
      body: {
        approvalStatus: "rejected",
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(rejectedResult);
  // Validate all rejected sellers have correct status and rejection reason
  for (const seller of rejectedResult.data) {
    TestValidator.equals(
      "rejected seller status",
      seller.approvalStatus,
      "rejected",
    );
    TestValidator.predicate(
      "rejected seller has rejection reason",
      seller.rejectionReason !== null,
    );
  }
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pending pagination records match data length",
    pendingResult.pagination.records === pendingResult.data.length,
  );
  TestValidator.predicate(
    "approved pagination records match data length",
    approvedResult.pagination.records === approvedResult.data.length,
  );
  TestValidator.predicate(
    "rejected pagination records match data length",
    rejectedResult.pagination.records === rejectedResult.data.length,
  );
}
