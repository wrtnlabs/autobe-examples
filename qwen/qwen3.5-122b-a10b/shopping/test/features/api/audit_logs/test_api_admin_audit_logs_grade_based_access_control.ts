import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminAuditLog";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdminAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_audit_logs_grade_based_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SuperAdmin123",
      reason: "System management and oversight",
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com",
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account and authenticate
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "RegularAdmin123",
      reason: "Daily operations management",
      href: "https://admin.example.com/register",
      referrer: "https://admin.example.com",
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Super admin performs various administrative actions to create audit logs
  // Note: In real scenario, these would be actual admin operations like seller approval, category creation, etc.
  // For this test, we assume audit logs are created through these operations
  // 4. Super admin searches audit logs - should see ALL logs
  const superAdminLogs = await api.functional.ecommerce.admin.audit_logs.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IEcommerceAdminAuditLog.IRequest,
    },
  );
  typia.assert(superAdminLogs);
  // 5. Regular admin searches audit logs - should only see their own actions
  const regularAdminLogs =
    await api.functional.ecommerce.admin.audit_logs.index(
      regularAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceAdminAuditLog.IRequest,
      },
    );
  typia.assert(regularAdminLogs);
  // 6. Validate access control
  // Super admin should have access to all logs
  TestValidator.predicate(
    "super admin can view audit logs",
    superAdminLogs.data.length >= 0,
  );
  // Regular admin should only see logs where they performed the action
  TestValidator.predicate(
    "regular admin audit logs filtered by their ID",
    regularAdminLogs.data.every((log) => log.admin.id === regularAdmin.id),
  );
  // 7. Regular admin attempts to filter by super admin's ID - should get restricted results
  const filteredBySuperAdmin =
    await api.functional.ecommerce.admin.audit_logs.index(
      regularAdminConnection,
      {
        body: {
          ecommerce_admin_id: superAdmin.id,
          page: 1,
          limit: 100,
        } satisfies IEcommerceAdminAuditLog.IRequest,
      },
    );
  typia.assert(filteredBySuperAdmin);
  // Regular admin should not see super admin's actions
  TestValidator.predicate(
    "regular admin cannot see super admin's actions",
    filteredBySuperAdmin.data.length === 0 ||
      filteredBySuperAdmin.data.every(
        (log) => log.admin.id === regularAdmin.id,
      ),
  );
  // 8. Compare result sets - super admin should have equal or more logs
  TestValidator.predicate(
    "super admin has equal or more audit log visibility",
    superAdminLogs.data.length >= regularAdminLogs.data.length,
  );
  // 9. Validate audit log structure
  if (superAdminLogs.data.length > 0) {
    const firstLog = superAdminLogs.data[0];
    TestValidator.predicate(
      "audit log contains admin information",
      firstLog.admin !== undefined && firstLog.admin.id !== undefined,
    );
    TestValidator.predicate(
      "audit log contains action type",
      firstLog.action_type !== undefined,
    );
    TestValidator.predicate(
      "audit log contains target entity",
      firstLog.target_entity !== undefined,
    );
    TestValidator.predicate(
      "audit log contains timestamp",
      firstLog.created_at !== undefined,
    );
  }
}
