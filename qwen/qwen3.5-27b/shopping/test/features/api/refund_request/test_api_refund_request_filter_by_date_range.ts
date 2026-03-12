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
 * Test that an administrator can filter refund requests by date ranges
 * for request submission (requested_at) and seller response (responded_at).
 */
export async function test_api_refund_request_filter_by_date_range(
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Test filtering by requested_at range (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const now = new Date();
  const requestedAtFilter = {
    requestedAtFrom: thirtyDaysAgo.toISOString(),
    requestedAtTo: now.toISOString(),
  } satisfies IShoppingMallRefundRequest.IRequest;
  const requestedAtResult =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      { body: requestedAtFilter },
    );
  typia.assert(requestedAtResult);
  // Verify all returned requests are within the requested_at range
  for (const refundRequest of requestedAtResult.data) {
    TestValidator.predicate(
      `requested_at >= ${requestedAtFilter.requestedAtFrom}`,
      new Date(refundRequest.requested_at) >=
        new Date(requestedAtFilter.requestedAtFrom!),
    );
    TestValidator.predicate(
      `requested_at <= ${requestedAtFilter.requestedAtTo}`,
      new Date(refundRequest.requested_at) <=
        new Date(requestedAtFilter.requestedAtTo!),
    );
  }
  // 3. Test filtering by responded_at range (last 15 days)
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  const respondedAtFilter = {
    respondedAtFrom: fifteenDaysAgo.toISOString(),
    respondedAtTo: now.toISOString(),
  } satisfies IShoppingMallRefundRequest.IRequest;
  const respondedAtResult =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      { body: respondedAtFilter },
    );
  typia.assert(respondedAtResult);
  // Verify all returned requests have responded_at in the range (not null)
  for (const refundRequest of respondedAtResult.data) {
    TestValidator.predicate(
      `responded_at is not null`,
      refundRequest.responded_at !== null,
    );
    TestValidator.predicate(
      `responded_at >= ${respondedAtFilter.respondedAtFrom}`,
      new Date(refundRequest.responded_at!) >=
        new Date(respondedAtFilter.respondedAtFrom!),
    );
    TestValidator.predicate(
      `responded_at <= ${respondedAtFilter.respondedAtTo}`,
      new Date(refundRequest.responded_at!) <=
        new Date(respondedAtFilter.respondedAtTo!),
    );
  }
  // 4. Test combined filtering (both requested_at and responded_at ranges)
  const combinedFilter = {
    requestedAtFrom: thirtyDaysAgo.toISOString(),
    requestedAtTo: now.toISOString(),
    respondedAtFrom: fifteenDaysAgo.toISOString(),
    respondedAtTo: now.toISOString(),
  } satisfies IShoppingMallRefundRequest.IRequest;
  const combinedResult =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      { body: combinedFilter },
    );
  typia.assert(combinedResult);
  // Verify all returned requests satisfy both date range conditions
  for (const refundRequest of combinedResult.data) {
    TestValidator.predicate(
      `requested_at in range`,
      new Date(refundRequest.requested_at) >=
        new Date(combinedFilter.requestedAtFrom!) &&
        new Date(refundRequest.requested_at) <=
          new Date(combinedFilter.requestedAtTo!),
    );
    TestValidator.predicate(
      `responded_at is not null`,
      refundRequest.responded_at !== null,
    );
    TestValidator.predicate(
      `responded_at in range`,
      new Date(refundRequest.responded_at!) >=
        new Date(combinedFilter.respondedAtFrom!) &&
        new Date(refundRequest.responded_at!) <=
          new Date(combinedFilter.respondedAtTo!),
    );
  }
  // 5. Test with status filter combination (approved + responded_at range)
  const statusFilter = {
    status: "approved",
    respondedAtFrom: fifteenDaysAgo.toISOString(),
    respondedAtTo: now.toISOString(),
  } satisfies IShoppingMallRefundRequest.IRequest;
  const statusResult =
    await api.functional.shoppingMall.admin.refund_requests.index(
      adminConnection,
      { body: statusFilter },
    );
  typia.assert(statusResult);
  // Verify all returned requests are approved and have responded_at in range
  for (const refundRequest of statusResult.data) {
    TestValidator.equals(
      "status is approved",
      refundRequest.status,
      "approved",
    );
    TestValidator.predicate(
      `responded_at is not null`,
      refundRequest.responded_at !== null,
    );
    TestValidator.predicate(
      `responded_at in range`,
      new Date(refundRequest.responded_at!) >=
        new Date(statusFilter.respondedAtFrom!) &&
        new Date(refundRequest.responded_at!) <=
          new Date(statusFilter.respondedAtTo!),
    );
  }
  // Verify pagination metadata is present
  TestValidator.predicate(
    "pagination current is valid",
    requestedAtResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    requestedAtResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is valid",
    requestedAtResult.pagination.records >= 0,
  );
}
