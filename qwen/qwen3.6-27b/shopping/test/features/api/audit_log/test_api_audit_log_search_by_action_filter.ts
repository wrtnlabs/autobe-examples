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
 * Test audit log search functionality filtered by action type 'approve'.
 *
 * Validates the audit log search endpoint with action filtering to ensure compliance workflow correctness. Authenticates as an administrator and searches for audit records matching the 'approve' action type. Verifies that all returned records contain the expected action value and complete audit trail information including target entity details, performing administrator identity, and creation timestamps. Confirms pagination metadata is accurately computed for filtered results.
 *
 * This test ensures that administrators can efficiently filter the audit trail to review specific governance operations, supporting compliance verification and dispute resolution workflows.
 *
 * 1. Administrator registers and authenticates via join endpoint.
 * 2. Administrator searches audit logs with action filter set to 'approve'.
 * 3. Validates that all returned records have action equal to 'approve'.
 * 4. Validates each record contains complete audit trail data (target_type, target_id, admin, created_at).
 * 5. Confirms pagination metadata reflects filtered result set correctly.
 */
export async function test_api_audit_log_search_by_action_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    password: RandomGenerator.alphaNumeric(16),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformAdmin.IJoin;
  const authorized = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(authorized);
  // 2. Search audit logs with action filter 'approve'
  const body = {
    action: "approve",
  } satisfies IEcommercePlatformAdminAuditLog.IRequest;
  const result = await api.functional.ecommercePlatform.admin.audit_logs.index(
    adminConnection,
    { body },
  );
  typia.assert(result);
  // 3. Validate all records have action 'approve'
  for (const record of result.data) {
    typia.assert(record);
    TestValidator.equals(
      "audit log action is approve",
      record.action,
      "approve",
    );
    // 4. Validate complete audit trail data
    TestValidator.predicate(
      "target_type is present",
      record.target_type !== undefined && record.target_type.length > 0,
    );
    TestValidator.predicate(
      "target_id is present and valid UUID",
      record.target_id !== undefined && record.target_id.length > 0,
    );
    TestValidator.predicate(
      "created_at is present",
      record.created_at !== undefined && record.created_at.length > 0,
    );
    typia.assert(record.admin);
    TestValidator.predicate(
      "admin id is present",
      record.admin.id !== undefined && record.admin.id.length > 0,
    );
  }
  // 5. Validate pagination metadata
  typia.assert(result.pagination);
  TestValidator.predicate(
    "current page is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    result.pagination.records >= 0,
  );
  const expectedFirstPageCount =
    result.pagination.records < result.pagination.limit
      ? result.pagination.records
      : result.pagination.limit;
  TestValidator.equals(
    "data length matches pagination",
    result.data.length,
    expectedFirstPageCount,
  );
  const expectedPages =
    result.pagination.records === 0
      ? 0
      : Math.ceil(result.pagination.records / result.pagination.limit);
  TestValidator.equals(
    "pages count is consistent with records and limit",
    result.pagination.pages,
    expectedPages,
  );
}
