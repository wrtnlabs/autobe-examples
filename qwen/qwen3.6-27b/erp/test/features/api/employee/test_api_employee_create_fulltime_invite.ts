import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Test full-time employee invitation workflow within an organization.
 *
 * Validates the core employee creation flow where an authenticated manager with employee management permissions invites a registered platform member to join their organization as a full-time employee. The test verifies that the employee record is correctly created with proper member linkage, role assignment, and employment type configuration.
 *
 * Special attention is given to confirming that the employment_type field is set to 'full-time' and that the status defaults to 'active' for newly invited employees. System-managed timestamps are also validated to ensure proper audit trail creation.
 *
 * 1. Manager registers as a new member, which automatically creates a default organization with built-in roles.
 * 2. A second member account is created to represent the employee-to-be-invited.
 * 3. The manager uses their authenticated connection to invite the second member as a full-time employee with a role assignment.
 * 4. Validates the employee record contains correct member reference, role, employment type 'full-time', and 'active' status.
 */
export async function test_api_employee_create_fulltime_invite(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager joins and gets authenticated with default organization
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {},
  });
  typia.assert(managerAuth);
  // 2. Second member joins to be invited as employee
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {},
  });
  typia.assert(employeeAuth);
  // 3. Manager invites the member as a full-time employee
  const employee = await generate_random_hrm_platform_member_employees_create(
    managerConnection,
    {
      body: {
        memberId: employeeAuth.id,
        employmentType: "full-time",
      },
    },
  );
  typia.assert(employee);
  // 4. Validate employee record
  TestValidator.equals(
    "employment type is full-time",
    employee.employment_type,
    "full-time",
  );
  TestValidator.equals("status is active", employee.status, "active");
  TestValidator.equals(
    "member id matches invited member",
    employee.member.id,
    employeeAuth.id,
  );
  TestValidator.predicate(
    "has role assignment",
    employee.role.id !== undefined && employee.role.id.length > 0,
  );
  TestValidator.predicate(
    "created_at is set",
    employee.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    employee.updated_at !== undefined,
  );
}
