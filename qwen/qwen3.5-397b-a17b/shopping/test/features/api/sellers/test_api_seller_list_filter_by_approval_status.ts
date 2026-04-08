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
 * Test filtering seller accounts by approval status to validate the seller approval workflow oversight capability.
 *
 * Validates the administrator's ability to filter and monitor seller accounts at different stages of the approval workflow. The test verifies that the approval status filter correctly isolates sellers and that rejection reasons are properly populated only for rejected sellers.
 *
 * The test ensures pagination metadata accurately reflects filtered results rather than total seller count, enabling administrators to effectively oversee pending applications, monitor approved sellers, and track rejected applications.
 *
 * 1. Administrator authenticates using join operation.
 * 2. Filter sellers by approvalStatus='pending' and verify all results are pending.
 * 3. Filter sellers by approvalStatus='approved' and verify all results are approved.
 * 4. Filter sellers by approvalStatus='rejected' and verify all results are rejected.
 * 5. Validate rejection reasons are populated only for rejected sellers.
 * 6. Validate pagination metadata reflects filtered counts.
 */
export async function test_api_seller_list_filter_by_approval_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test pending sellers filter
  const pendingResult =
    await api.functional.shoppingMall.admin.admin.sellers.index(
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
  TestValidator.predicate("all pending sellers have pending status", () =>
    pendingResult.data.every((seller) => seller.approvalStatus === "pending"),
  );
  // Validate pending sellers have null rejectionReason
  TestValidator.predicate("pending sellers have null rejectionReason", () =>
    pendingResult.data.every((seller) => seller.rejectionReason === null),
  );
  // Validate pagination reflects filtered count
  TestValidator.equals(
    "pending pagination records count",
    pendingResult.pagination.records,
    pendingResult.data.length,
  );
  // 3. Test approved sellers filter
  const approvedResult =
    await api.functional.shoppingMall.admin.admin.sellers.index(
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
  TestValidator.predicate("all approved sellers have approved status", () =>
    approvedResult.data.every((seller) => seller.approvalStatus === "approved"),
  );
  // Validate approved sellers have null rejectionReason
  TestValidator.predicate("approved sellers have null rejectionReason", () =>
    approvedResult.data.every((seller) => seller.rejectionReason === null),
  );
  // Validate pagination reflects filtered count
  TestValidator.equals(
    "approved pagination records count",
    approvedResult.pagination.records,
    approvedResult.data.length,
  );
  // 4. Test rejected sellers filter
  const rejectedResult =
    await api.functional.shoppingMall.admin.admin.sellers.index(
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
  // Validate all rejected sellers have correct status
  TestValidator.predicate("all rejected sellers have rejected status", () =>
    rejectedResult.data.every((seller) => seller.approvalStatus === "rejected"),
  );
  // Validate rejected sellers have non-null rejectionReason
  TestValidator.predicate(
    "rejected sellers have non-null rejectionReason",
    () =>
      rejectedResult.data.every((seller) => seller.rejectionReason !== null),
  );
  // Validate pagination reflects filtered count
  TestValidator.equals(
    "rejected pagination records count",
    rejectedResult.pagination.records,
    rejectedResult.data.length,
  );
}
