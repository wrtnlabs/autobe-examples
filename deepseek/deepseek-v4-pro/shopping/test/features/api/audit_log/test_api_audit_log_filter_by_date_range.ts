import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test audit log filtering by date range with inclusive bounds.
 *
 * Validates that an authenticated administrator can query the platform's
 * administrative audit log using the created_at_from and created_at_to
 * parameters to define a closed date/time interval. Ensures that every
 * returned entry's created_at timestamp falls within the specified range
 * inclusive of both bounds, that the pagination metadata accurately reflects
 * the filtered count, and that results remain sorted by created_at descending.
 *
 * The test uses the full date range from the oldest to the newest audit entry
 * to verify that all entries are correctly included when the bounds encompass
 * the entire dataset.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Fetch all audit logs without date filter to obtain boundary timestamps.
 * 3. Query audit logs with created_at_from set to the oldest entry's timestamp
 *    and created_at_to set to the newest entry's timestamp.
 * 4. Validate every returned entry's created_at falls within [from, to].
 * 5. Validate pagination records count matches the actual filtered results.
 * 6. Validate entries are sorted by created_at descending (newest first).
 */
export async function test_api_audit_log_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Fetch all audit logs without date filter to establish baseline
  const allLogs = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(allLogs);
  if (allLogs.data.length === 0) {
    return;
  }
  // 3. Extract boundary timestamps from the full dataset
  // Data is sorted by created_at DESC: data[0] is newest, data[last] is oldest
  const oldestTimestamp = allLogs.data[allLogs.data.length - 1].created_at;
  const newestTimestamp = allLogs.data[0].created_at;
  // 4. Query with the closed interval [oldest, newest]
  const filteredLogs = await api.functional.shoppingMall.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        created_at_from: oldestTimestamp,
        created_at_to: newestTimestamp,
        limit: 100,
      } satisfies IShoppingMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(filteredLogs);
  // 5. Validate every entry falls within the inclusive range
  const oldestDate = new Date(oldestTimestamp);
  const newestDate = new Date(newestTimestamp);
  for (const entry of filteredLogs.data) {
    const entryDate = new Date(entry.created_at);
    TestValidator.predicate(
      `entry created_at not before from bound`,
      entryDate.getTime() >= oldestDate.getTime(),
    );
    TestValidator.predicate(
      `entry created_at not after to bound`,
      entryDate.getTime() <= newestDate.getTime(),
    );
  }
  // 6. Validate pagination records count matches actual data length
  TestValidator.equals(
    "pagination records equals filtered data length",
    filteredLogs.pagination.records,
    filteredLogs.data.length,
  );
  // 7. Validate descending order by created_at
  for (let i = 1; i < filteredLogs.data.length; i++) {
    const prevDate = new Date(filteredLogs.data[i - 1].created_at);
    const currDate = new Date(filteredLogs.data[i].created_at);
    TestValidator.predicate(
      `entries sorted by created_at descending at index ${i}`,
      prevDate.getTime() >= currDate.getTime(),
    );
  }
}
