import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_refund_request_snapshot_filter_by_status_and_date(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Define date range for filtering (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = thirtyDaysAgo.toISOString();
  const to = now.toISOString();
  // 3. Query with status filter only
  const statusFilter = "approved";
  const statusResult =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: statusFilter,
          limit: 10,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(statusResult);
  // Validate all results have the specified status
  for (const snapshot of statusResult.data) {
    TestValidator.equals(
      "snapshot status matches filter",
      snapshot.status,
      statusFilter,
    );
  }
  // 4. Query with date range filter only
  const dateRangeResult =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          from,
          to,
          limit: 10,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate all results are within the date range
  const fromDate = new Date(from);
  const toDate = new Date(to);
  for (const snapshot of dateRangeResult.data) {
    const createdAt = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot created_at is within date range",
      createdAt >= fromDate && createdAt <= toDate,
    );
  }
  // 5. Query with combined status and date range filters
  const combinedResult =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: statusFilter,
          from,
          to,
          limit: 10,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate combined filter results
  for (const snapshot of combinedResult.data) {
    TestValidator.equals(
      "combined filter - status matches",
      snapshot.status,
      statusFilter,
    );
    const createdAt = new Date(snapshot.created_at);
    TestValidator.predicate(
      "combined filter - created_at is within date range",
      createdAt >= fromDate && createdAt <= toDate,
    );
  }
  // 6. Test pagination with filtered results
  const page1Result =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: statusFilter,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(page1Result);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", page1Result.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records is non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page1Result.pagination.pages >= 0,
  );
  // Validate page 1 data has correct number of items (may be less than limit on last page)
  TestValidator.predicate(
    "page 1 data length is within limit",
    page1Result.data.length <= 5,
  );
  // 7. Query with different status filter ('rejected')
  const rejectedResult =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "rejected",
          limit: 10,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(rejectedResult);
  // Validate all results have 'rejected' status
  for (const snapshot of rejectedResult.data) {
    TestValidator.equals(
      "rejected status filter works",
      snapshot.status,
      "rejected",
    );
  }
  // 8. Query with 'pending' status filter
  const pendingResult =
    await api.functional.shoppingMall.administrator.refund_request_snapshots.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 10,
        } satisfies IShoppingMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Validate all results have 'pending' status
  for (const snapshot of pendingResult.data) {
    TestValidator.equals(
      "pending status filter works",
      snapshot.status,
      "pending",
    );
  }
  // 9. Verify snapshot immutability - all snapshots have required fields
  const allResults = [
    ...statusResult.data,
    ...dateRangeResult.data,
    ...combinedResult.data,
  ];
  for (const snapshot of allResults) {
    TestValidator.predicate("snapshot has id", snapshot.id.length === 36);
    TestValidator.predicate("snapshot has reason", snapshot.reason.length > 0);
    TestValidator.predicate(
      "snapshot has refundRequest",
      snapshot.refundRequest !== null,
    );
  }
}
