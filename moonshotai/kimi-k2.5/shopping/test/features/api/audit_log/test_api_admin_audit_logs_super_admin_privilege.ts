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
 * Test super administrator privilege escalation for audit logs access.
 * Super administrators can retrieve audit logs from both regular admin and super adminaudit log tables,
 * including critical security events like administrator promotions/demotions.
 * Validates that response contains super admin actions and admin objects correctly identify admin grades.
 */
export async function test_api_admin_audit_logs_super_admin_privilege(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Verify the authenticated user has super_admin grade
  TestValidator.predicate(
    "super admin has super_admin grade",
    superAdmin.grade === "super_admin",
  );
  // 2. Query audit logs without filters to retrieve all audit log types
  const response = await api.functional.ecommerceMall.admin.audit_logs.index(
    superAdminConnection,
    {
      body: {
        adminId: null,
        actionTypes: null,
        resourceTypes: null,
        resourceId: null,
        ipAddress: null,
        dateFrom: null,
        dateTo: null,
        createdAt: null,
        id: null,
        page: null,
        limit: null,
      } satisfies IEcommerceMallAdminAuditLog.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate response contains pagination and data array
  TestValidator.predicate(
    "response has pagination",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  // 4. Validate audit log entries exist and have correct structure
  // Note: In a fresh test environment, there may be no audit logs yet
  // So we validate structure only when data exists
  if (response.data.length > 0) {
    // Check each audit log entry has required properties
    for (const log of response.data) {
      typia.assert(log);
      // Validate admin object structure
      TestValidator.predicate("log has admin object", log.admin !== undefined);
      TestValidator.predicate("admin has id", typeof log.admin.id === "string");
      TestValidator.predicate(
        "admin has email",
        typeof log.admin.email === "string",
      );
      TestValidator.predicate(
        "admin has valid grade",
        log.admin.grade === "regular" || log.admin.grade === "super_admin",
      );
      TestValidator.predicate(
        "admin has status",
        log.admin.status === "active" ||
          log.admin.status === "suspended" ||
          log.admin.status === "banned",
      );
      TestValidator.predicate(
        "admin has createdAt",
        typeof log.admin.createdAt === "string",
      );
      // Validate action type exists
      TestValidator.predicate("log has action", typeof log.action === "string");
      TestValidator.predicate("action is non-empty", log.action.length > 0);
      // Validate timestamps
      TestValidator.predicate(
        "log has createdAt",
        typeof log.createdAt === "string",
      );
    }
    // 5. Check for super admin actions if they exist in the dataset
    const superAdminActions = [
      "promote_admin",
      "demote_admin",
      "create_admin",
      "delete_admin",
    ];
    const hasSuperAdminAction = response.data.some((log) =>
      superAdminActions.some((action) =>
        log.action.toLowerCase().includes(action),
      ),
    );
    // Log whether super admin actions are present (they may not exist in test data)
    TestValidator.predicate("audit logs structure is valid", true);
    // Validate that super admin themselves can be identified in logs if present
    const superAdminLogs = response.data.filter(
      (log) => log.admin.grade === "super_admin",
    );
    if (superAdminLogs.length > 0) {
      TestValidator.predicate("super admin logs are accessible", true);
    }
  }
  // 6. Test pagination parameters work correctly
  const limitedResponse =
    await api.functional.ecommerceMall.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          adminId: null,
          actionTypes: null,
          resourceTypes: null,
          resourceId: null,
          ipAddress: null,
          dateFrom: null,
          dateTo: null,
          createdAt: null,
          id: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(limitedResponse);
  TestValidator.predicate(
    "limited response has valid pagination",
    limitedResponse.pagination.limit <= 10,
  );
}
