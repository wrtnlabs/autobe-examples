import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering administrative audit logs by date range and verify descending order.
 *
 * Validates that administrators can query the audit trail with date range filters and receive results sorted correctly. The test verifies that:
 * - Date range filtering using createdAtFrom and createdAtTo works correctly
 * - Audit logs are sorted by createdAt in descending order (newest first)
 * - A wide date range captures all available logs
 * - Boundary conditions correctly include logs at the exact start timestamp
 *
 * This test creates an administrator account, performs actions that generate audit log entries, then queries the audit logs with various date range filters to ensure the filtering and ordering work as expected.
 *
 * 1. Administrator registration creates initial audit log entry
 * 2. Retrieve all audit logs to establish baseline count
 * 3. Apply narrow date range filter and verify results fall within range
 * 4. Verify descending order by comparing consecutive timestamps
 * 5. Apply wide date range and compare total count to unfiltered query
 * 6. Test boundary inclusion by setting createdAtFrom to a known log timestamp
 */
export async function test_api_audit_log_filtering_by_date_range_and_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin - this action creates an audit log entry
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {});
  typia.assert(authorizedAdmin);
  // Record timestamp after admin creation
  const afterJoinTimestamp = new Date().toISOString();
  // Small delay to ensure distinct timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 2. Get all audit logs without filters to establish baseline
  const allLogsResponse =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(allLogsResponse);
  // Verify we have at least the join action logged
  TestValidator.predicate(
    "has at least one audit log",
    allLogsResponse.data.length >= 1,
  );
  // 3. Apply date range filter with narrow range (last few seconds)
  const narrowRangeResponse =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          createdAtFrom: afterJoinTimestamp,
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(narrowRangeResponse);
  // Verify all returned logs are within the date range
  for (const log of narrowRangeResponse.data) {
    TestValidator.predicate(
      "log createdAt >= createdAtFrom",
      new Date(log.createdAt) >= new Date(afterJoinTimestamp),
    );
  }
  // 4. Verify descending order (newest first) - compare consecutive timestamps
  for (let i = 0; i < narrowRangeResponse.data.length - 1; i++) {
    const currentLog = narrowRangeResponse.data[i];
    const nextLog = narrowRangeResponse.data[i + 1];
    TestValidator.predicate(
      "logs sorted in descending order",
      new Date(currentLog.createdAt) >= new Date(nextLog.createdAt),
    );
  }
  // 5. Apply wide date range and verify count matches unfiltered query
  const farFutureDate = new Date();
  farFutureDate.setFullYear(farFutureDate.getFullYear() + 1);
  const farPastDate = new Date("2020-01-01T00:00:00Z");
  const wideRangeResponse =
    await api.functional.ecommerceMall.admin.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          createdAtFrom: farPastDate.toISOString(),
          createdAtTo: farFutureDate.toISOString(),
          limit: 100,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(wideRangeResponse);
  // Wide range should capture all logs
  TestValidator.predicate(
    "wide range has at least as many logs as unfiltered",
    wideRangeResponse.data.length >= allLogsResponse.data.length,
  );
  // 6. Test boundary inclusion - set createdAtFrom to a known log's timestamp
  if (allLogsResponse.data.length > 0) {
    const knownLogTimestamp = allLogsResponse.data[0].createdAt;
    const boundaryResponse =
      await api.functional.ecommerceMall.admin.admin.audit_logs.index(
        adminConnection,
        {
          body: {
            createdAtFrom: knownLogTimestamp,
            limit: 100,
          } satisfies IEcommerceMallAdminAuditLog.IRequest,
        },
      );
    typia.assert(boundaryResponse);
    // Log with exact timestamp should be included
    const includedInResults = boundaryResponse.data.some(
      (log) => log.createdAt === knownLogTimestamp,
    );
    TestValidator.predicate(
      "log at exact createdAtFrom boundary is included",
      includedInResults,
    );
  }
  // 7. Verify pagination metadata is returned correctly
  TestValidator.predicate(
    "has pagination info",
    narrowRangeResponse.pagination !== null,
  );
  TestValidator.predicate(
    "pagination has valid current page",
    narrowRangeResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    narrowRangeResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    narrowRangeResponse.pagination.records >= 0,
  );
}
