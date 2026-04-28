import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdminAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator audit log search functionality filtered by date range.
 *
 * Validates the complete audit log search workflow where an administrator authenticates and queries the platform's governance audit trail within a specific time period. Verifies that the search endpoint correctly applies date range filtering, returns properly paginated results, and that all returned records have timestamps within the specified boundaries.
 *
 * Tests the compliance reporting workflow where administrators review platform governance activities (bans, approvals, category management, promotions) within specific periods for audit verification and regulatory compliance. The endpoint should return empty results rather than errors for invalid date combinations.
 *
 * 1. Administrator registers and authenticates using the join utility.
 * 2. Constructs a date range from 30 days ago to the current moment.
 * 3. Submits a PATCH search request with from_date and to_date parameters.
 * 4. Validates response structure and pagination metadata accuracy.
 * 5. Confirms all returned records have created_at within the date range.
 */
export async function test_api_audit_log_search_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // 2. Construct date range query parameters
  const now = new Date();
  const fromDate = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const toDate = now.toISOString();
  // 3. Create search request body
  const body = {
    from_date: fromDate,
    to_date: toDate,
  } satisfies IEcommercePlatformAdminAuditLog.IRequest;
  // 4. Execute audit log search with date range
  const response =
    await api.functional.ecommercePlatform.admin.audit_logs.index(
      adminConnection,
      { body },
    );
  // 5. Validate response structure
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit >= 1,
  );
  // 7. Validate date range filtering on returned records
  const fromDateMs = new Date(fromDate).getTime();
  const toDateMs = new Date(toDate).getTime();
  for (const record of response.data) {
    const recordTime = new Date(record.created_at).getTime();
    TestValidator.predicate(
      `record ${record.id} created_at is on or after from_date`,
      recordTime >= fromDateMs,
    );
    TestValidator.predicate(
      `record ${record.id} created_at is on or before to_date`,
      recordTime <= toDateMs,
    );
    TestValidator.predicate(
      `record ${record.id} has valid target_type`,
      record.target_type.length > 0,
    );
    TestValidator.predicate(
      `record ${record.id} has valid action`,
      record.action.length > 0,
    );
  }
  // 8. Validate pagination consistency
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
}
