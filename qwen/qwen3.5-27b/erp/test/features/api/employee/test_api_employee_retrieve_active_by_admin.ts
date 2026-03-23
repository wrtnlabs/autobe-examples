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
 * Test that an authenticated admin can retrieve detailed information about an active employee within their organization.
 * The test verifies that the response includes all nested entities: member account, organization context,
 * role assignment, and department. The employee's employment_type and status should be correctly returned.
 */
export async function test_api_employee_retrieve_active_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Generate a valid employee ID for retrieval test
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the active employee by admin
  const employee = await api.functional.hrmPlatform.admin.employees.at(
    adminConnection,
    {
      employeeId,
    },
  );
  typia.assert(employee);
  // 4. Validate employee details
  TestValidator.equals("employee ID matches", employee.id, employeeId);
  TestValidator.equals("status is active", employee.status, "active");
  TestValidator.predicate(
    "employment type is valid",
    ["full-time", "part-time", "contractor", "intern"].includes(
      employee.employment_type,
    ),
  );
  // 5. Validate nested member entity
  TestValidator.predicate(
    "member has valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.member.email),
  );
  TestValidator.predicate(
    "member has created_at",
    employee.member.created_at !== undefined,
  );
  TestValidator.predicate(
    "member has valid ID",
    employee.member.id !== undefined,
  );
  // 6. Validate nested organization entity
  TestValidator.predicate(
    "organization has name",
    employee.organization.name.length > 0,
  );
  TestValidator.predicate(
    "organization has valid ID",
    employee.organization.id !== undefined,
  );
  TestValidator.predicate(
    "organization has owner",
    employee.organization.owner.id !== undefined,
  );
  TestValidator.predicate(
    "organization has setting",
    employee.organization.setting.id !== undefined,
  );
  TestValidator.predicate(
    "organization has logo",
    employee.organization.logo.id !== undefined,
  );
  // 7. Validate nested role entity
  TestValidator.predicate("role has name", employee.role.name.length > 0);
  TestValidator.predicate(
    "role has is_builtin flag",
    typeof employee.role.is_builtin === "boolean",
  );
  TestValidator.predicate("role has valid ID", employee.role.id !== undefined);
  TestValidator.predicate(
    "role has employee_count",
    typeof employee.role.employee_count === "number",
  );
  TestValidator.predicate(
    "role has permission_count",
    typeof employee.role.permission_count === "number",
  );
  // 8. Validate department (can be null)
  if (employee.department !== null) {
    TestValidator.predicate(
      "department has name",
      employee.department.name.length > 0,
    );
    TestValidator.predicate(
      "department has valid ID",
      employee.department.id !== undefined,
    );
    TestValidator.predicate(
      "department has organization",
      employee.department.organization.id !== undefined,
    );
  }
  // 9. Validate timestamps
  TestValidator.predicate(
    "created_at exists",
    employee.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    employee.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is null for active employee",
    employee.deleted_at,
    null,
  );
}
