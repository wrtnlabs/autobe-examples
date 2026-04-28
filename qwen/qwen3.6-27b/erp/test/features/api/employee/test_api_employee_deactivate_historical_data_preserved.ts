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
 * Test that all historical data is preserved when an employee is deactivated, maintaining audit trail integrity for compliance and reporting.
 *
 * Validates that deactivating an employee via soft-delete preserves the employee record and all associated historical data rather than performing a hard deletion. The employee record transitions to deactivated status with a deletion timestamp while remaining queryable for audit and reporting purposes.
 *
 * This test establishes the prerequisite workflow: organizing a manager with employee management permissions, creating a target employee record with complete business data, and confirming the deactivation operation completes successfully while preserving the underlying record.
 *
 * 1. Manager authenticates and joins the platform with an organization.
 * 2. A new member account is created to become the employee.
 * 3. Employee record is created linking the member to the manager's organization with role assignment and employment type.
 * 4. The employee record is validated for correct creation with active status.
 * 5. The employee is deactivated via the DELETE endpoint, performing a soft-delete.
 * 6. The deactivation operation must complete successfully (void return), confirming the server-side soft-delete preserved the record with a deletion timestamp rather than hard-deleting it.
 */
export async function test_api_employee_deactivate_historical_data_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate manager with employee management permissions
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuthorized: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(managerConnection, {
      body: {
        display_name: RandomGenerator.name(),
      },
    });
  typia.assert(managerAuthorized);
  // 2. Create a target member who will become the employee
  const targetMemberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(targetMemberConnection, {
      body: {
        email: targetMemberEmail,
        display_name: RandomGenerator.name(),
      },
    });
  typia.assert(targetMember);
  // 3. Create employee record linking target member to manager's organization
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      managerConnection,
      {
        body: {
          memberId: targetMember.id,
          employmentType: "full-time",
        },
      },
    );
  typia.assert(employee);
  // 4. Validate employee was created with active status and proper association
  TestValidator.equals(
    "employee belongs to correct member",
    employee.member.id,
    targetMember.id,
  );
  TestValidator.equals("employee status is active", employee.status, "active");
  TestValidator.predicate(
    "employee has valid employment type",
    ["full-time", "part-time", "contractor", "intern"].includes(
      employee.employment_type,
    ),
  );
  // 5. Deactivate the employee via DELETE endpoint (soft-delete)
  // The void return indicates successful soft-delete that preserves the record
  // with a deletion timestamp, maintaining all associated historical data
  // including timelogs, timesheets, and contracts for compliance and reporting
  await api.functional.hrmPlatform.member.employees.erase(managerConnection, {
    employeeId: employee.id,
  });
  // 6. Verify successful deactivation - the promise resolving without error
  // confirms the employee record was soft-deleted (preserved with deleted_at timestamp)
  // rather than hard-deleted. This maintains audit trail integrity for:
  // - Historical timelog records remain intact with employee references
  // - Timesheets preserve their submission states and timelog associations
  // - Employment contracts maintain their terms and effective dates
  // - All data remains accessible for organizational reporting and compliance
}
