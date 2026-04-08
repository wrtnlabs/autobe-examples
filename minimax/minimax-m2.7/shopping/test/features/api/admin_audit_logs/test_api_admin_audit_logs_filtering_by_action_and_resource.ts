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
 * Test super admin can filter audit logs by action type and resource type.
 *
 * Validates the administrative audit log filtering functionality for super administrators. This test ensures that super administrators can query audit logs with precise filters for action type and resource type, enabling effective platform oversight and compliance monitoring.
 *
 * The test workflow:
 * 1. Register and authenticate as super administrator
 * 2. Query audit logs with specific action and resource type filters
 * 3. Validate that only matching audit logs are returned
 * 4. Validate pagination metadata accuracy
 *
 * @param connection API connection
 */
export async function test_api_admin_audit_logs_filtering_by_action_and_resource(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: `${RandomGenerator.alphaNumeric(8)}A${RandomGenerator.name(1).toLowerCase()}!`,
      href: "https://test.example.com/admin",
      referrer: "https://test.example.com/login",
    },
  });
  // 2. Query audit logs with action type filter
  const actionType = "approve_seller";
  const resourceType = "seller";
  const filteredResponse =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: actionType,
          resourceType: resourceType,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(filteredResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination exists",
    filteredResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has valid pagination",
    filteredResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "has valid limit",
    filteredResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "has valid records count",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages count",
    filteredResponse.pagination.pages >= 0,
  );
  // 4. Validate all returned audit logs match the filters
  for (const auditLog of filteredResponse.data) {
    TestValidator.equals(
      "action type matches filter",
      auditLog.action,
      actionType,
    );
    TestValidator.equals(
      "resource type matches filter",
      auditLog.resourceType,
      resourceType,
    );
  }
  // 5. Query without filters to compare total count
  const allLogsResponse =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(allLogsResponse);
  // 6. Validate that filtered count is less than or equal to total count
  TestValidator.predicate(
    "filtered records less than or equal to total",
    filteredResponse.pagination.records <= allLogsResponse.pagination.records,
  );
  // 7. Test filtering by action type only
  const actionOnlyResponse =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          action: actionType,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(actionOnlyResponse);
  // Validate all logs have the specified action
  for (const auditLog of actionOnlyResponse.data) {
    TestValidator.equals(
      "action type matches filter",
      auditLog.action,
      actionType,
    );
  }
  // 8. Test filtering by resource type only
  const resourceOnlyResponse =
    await api.functional.ecommerceMall.superAdmin.admin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          resourceType: resourceType,
          limit: 20,
          page: 1,
        } satisfies IEcommerceMallAdminAuditLog.IRequest,
      },
    );
  typia.assert(resourceOnlyResponse);
  // Validate all logs have the specified resource type
  for (const auditLog of resourceOnlyResponse.data) {
    TestValidator.equals(
      "resource type matches filter",
      auditLog.resourceType,
      resourceType,
    );
  }
}
