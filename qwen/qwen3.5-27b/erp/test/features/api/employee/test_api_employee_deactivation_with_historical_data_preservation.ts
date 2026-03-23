import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test employee deactivation with historical data preservation.
 * Verifies that deactivating an employee preserves all historical data
 * and allows reactivation.
 */
export async function test_api_employee_deactivation_with_historical_data_preservation(
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
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Generate a mock employee ID for testing
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Deactivate the employee
  const deactivatedEmployee =
    await api.functional.hrmPlatform.admin.employees.update(adminConnection, {
      employeeId,
      body: {
        status: "deactivated",
      } satisfies IHrmPlatformEmployee.IUpdate,
    });
  typia.assert(deactivatedEmployee);
  // 4. Verify deactivation status
  TestValidator.equals(
    "employee status is deactivated",
    deactivatedEmployee.status,
    "deactivated",
  );
  // 5. Capture original relationships for comparison
  const originalMemberEmail = deactivatedEmployee.member.email;
  const originalOrganizationId = deactivatedEmployee.organization.id;
  const originalRoleId = deactivatedEmployee.role.id;
  const originalEmploymentType = deactivatedEmployee.employment_type;
  const originalDepartmentId = deactivatedEmployee.department?.id ?? null;
  // 6. Verify all required relationships exist
  TestValidator.predicate(
    "member relationship exists",
    deactivatedEmployee.member.email !== undefined,
  );
  TestValidator.predicate(
    "organization relationship exists",
    deactivatedEmployee.organization.name !== undefined,
  );
  TestValidator.predicate(
    "role relationship exists",
    deactivatedEmployee.role.name !== undefined,
  );
  // 7. Reactivate the employee
  const reactivatedEmployee =
    await api.functional.hrmPlatform.admin.employees.update(adminConnection, {
      employeeId,
      body: {
        status: "active",
      } satisfies IHrmPlatformEmployee.IUpdate,
    });
  typia.assert(reactivatedEmployee);
  // 8. Verify reactivation status
  TestValidator.equals(
    "employee status is active after reactivation",
    reactivatedEmployee.status,
    "active",
  );
  // 9. Verify historical data preservation - member unchanged
  TestValidator.equals(
    "member email preserved after reactivation",
    reactivatedEmployee.member.email,
    originalMemberEmail,
  );
  // 10. Verify historical data preservation - organization unchanged
  TestValidator.equals(
    "organization id preserved after reactivation",
    reactivatedEmployee.organization.id,
    originalOrganizationId,
  );
  // 11. Verify historical data preservation - role unchanged
  TestValidator.equals(
    "role id preserved after reactivation",
    reactivatedEmployee.role.id,
    originalRoleId,
  );
  // 12. Verify historical data preservation - employment type unchanged
  TestValidator.equals(
    "employment type preserved after reactivation",
    reactivatedEmployee.employment_type,
    originalEmploymentType,
  );
  // 13. Verify historical data preservation - department unchanged
  TestValidator.equals(
    "department id preserved after reactivation",
    reactivatedEmployee.department?.id ?? null,
    originalDepartmentId,
  );
  // 14. Verify timestamps are updated
  TestValidator.predicate(
    "updated_at changed after reactivation",
    reactivatedEmployee.updated_at !== deactivatedEmployee.updated_at,
  );
}
