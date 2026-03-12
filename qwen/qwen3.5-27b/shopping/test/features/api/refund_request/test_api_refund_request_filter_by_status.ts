import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an administrator can filter refund requests by their approval status (pending, approved, rejected).
 *
 * This test validates the admin refund request filtering functionality by:
 * 1. Authenticating as an administrator
 * 2. Querying refund requests filtered by each status type (pending, approved, rejected)
 * 3. Verifying that each filter returns only requests matching the specified status
 * 4. Validating that pending requests have null responded_at while approved/rejected have populated timestamps
 * 5. Confirming pagination metadata accurately reflects filtered result counts
 */
export async function test_api_refund_request_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Test filtering by status='pending'
  const pendingResult =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "pending",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Verify all returned items are pending
  for (const refundRequest of pendingResult.data) {
    TestValidator.equals("status is pending", refundRequest.status, "pending");
    TestValidator.equals(
      "responded_at is null for pending",
      refundRequest.responded_at,
      null,
    );
  }
  // Verify pagination records match data length
  TestValidator.equals(
    "pending pagination records count",
    pendingResult.pagination.records,
    pendingResult.data.length,
  );
  // 3. Test filtering by status='approved'
  const approvedResult =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "approved",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Verify all returned items are approved
  for (const refundRequest of approvedResult.data) {
    TestValidator.equals(
      "status is approved",
      refundRequest.status,
      "approved",
    );
    TestValidator.predicate(
      "responded_at is not null for approved",
      refundRequest.responded_at !== null,
    );
  }
  // Verify pagination records match data length
  TestValidator.equals(
    "approved pagination records count",
    approvedResult.pagination.records,
    approvedResult.data.length,
  );
  // 4. Test filtering by status='rejected'
  const rejectedResult =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      {
        body: {
          status: "rejected",
        } satisfies IShoppingMallRefundRequest.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Verify all returned items are rejected
  for (const refundRequest of rejectedResult.data) {
    TestValidator.equals(
      "status is rejected",
      refundRequest.status,
      "rejected",
    );
    TestValidator.predicate(
      "responded_at is not null for rejected",
      refundRequest.responded_at !== null,
    );
  }
  // Verify pagination records match data length
  TestValidator.equals(
    "rejected pagination records count",
    rejectedResult.pagination.records,
    rejectedResult.data.length,
  );
  // 5. Verify that different status filters return different result sets
  const allStatuses = [
    ...pendingResult.data.map((r) => r.id),
    ...approvedResult.data.map((r) => r.id),
    ...rejectedResult.data.map((r) => r.id),
  ];
  const uniqueStatuses = new Set(allStatuses);
  TestValidator.predicate(
    "no duplicate refund request IDs across status filters",
    allStatuses.length === uniqueStatuses.size,
  );
}
