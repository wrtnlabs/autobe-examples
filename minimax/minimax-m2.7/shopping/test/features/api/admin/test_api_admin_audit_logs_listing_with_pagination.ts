import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminAuditLog";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super admin can list all administrative audit logs with pagination.
 *
 * Validates that a super administrator can successfully query the complete audit trail
 * of all administrative actions performed on the platform. The test verifies paginated
 * results are returned with correct metadata and that each audit log entry contains all
 * required fields including action details, resource information, IP address, timestamp,
 * and administrator summary.
 *
 * The test ensures the pagination metadata is accurate (current page, total records,
 * total pages, limit) and that audit log entries are properly sorted by creation date
 * in descending order (newest first).
 *
 * 1. Authenticate as super administrator using join endpoint.
 * 2. Query audit logs without any filters (empty request body).
 * 3. Validate response includes pagination metadata.
 * 4. Validate each audit log entry contains required fields.
 * 5. Verify results are sorted by createdAt in descending order.
 */
export async function test_api_admin_audit_logs_listing_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Query audit logs without any filters
  const auditLogsResponse =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsResponse);
  // 3. Validate pagination metadata exists
  const pagination = auditLogsResponse.pagination;
  TestValidator.equals("pagination exists", pagination !== null, true);
  TestValidator.equals("current page is valid", pagination.current >= 0, true);
  TestValidator.equals("limit is valid", pagination.limit >= 0, true);
  TestValidator.equals("records is valid", pagination.records >= 0, true);
  TestValidator.equals("pages is valid", pagination.pages >= 0, true);
  // 4. Validate data array exists
  TestValidator.equals(
    "data array exists",
    Array.isArray(auditLogsResponse.data),
    true,
  );
  // 5. Validate each audit log entry contains required fields
  for (const auditLog of auditLogsResponse.data) {
    TestValidator.equals("id is valid UUID", auditLog.id !== undefined, true);
    TestValidator.equals("action exists", auditLog.action !== undefined, true);
    TestValidator.equals(
      "resourceType exists",
      auditLog.resourceType !== undefined,
      true,
    );
    TestValidator.equals(
      "resourceId is valid UUID",
      auditLog.resourceId !== undefined,
      true,
    );
    TestValidator.equals(
      "ipAddress exists",
      auditLog.ipAddress !== undefined,
      true,
    );
    TestValidator.equals(
      "createdAt is valid date-time",
      auditLog.createdAt !== undefined,
      true,
    );
    // Validate admin summary
    TestValidator.equals(
      "admin summary exists",
      auditLog.admin !== undefined,
      true,
    );
    TestValidator.equals(
      "admin id is valid UUID",
      auditLog.admin.id !== undefined,
      true,
    );
    TestValidator.equals(
      "admin email exists",
      auditLog.admin.email !== undefined,
      true,
    );
  }
  // 6. Verify results are sorted by createdAt in descending order (newest first)
  if (auditLogsResponse.data.length > 1) {
    for (let i = 0; i < auditLogsResponse.data.length - 1; i++) {
      const current = new Date(auditLogsResponse.data[i].createdAt).getTime();
      const next = new Date(auditLogsResponse.data[i + 1].createdAt).getTime();
      TestValidator.predicate(
        "audit logs sorted by createdAt descending",
        current >= next,
      );
    }
  }
}
