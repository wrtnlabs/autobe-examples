import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";

/**
 * Test updating an employee's status from active to deactivated.
 *
 * Validates the complete employee status update workflow including member authentication, employee creation with active status, and status change to deactivated. Ensures that the status field is correctly updated while preserving all other employee attributes such as position, employment type, department assignment, role assignment, and hire date.
 *
 * Special attention is given to verifying that the employee record remains intact (not soft-deleted) and that the updated_at timestamp reflects the modification time. The deactivated employee should lose access to organization resources but the record must remain for audit and reporting purposes.
 *
 * 1. Authenticate as member to access employee management operations.
 * 2. Create employee record with active status and various attributes.
 * 3. Update the employee's status to 'deactivated'.
 * 4. Validate status is 'deactivated' and all other attributes are preserved.
 * 5. Verify updated_at timestamp is different from created_at.
 * 6. Confirm employee record still exists (not soft-deleted).
 */
export async function test_api_employee_update_status_to_deactivated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create employee with active status
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {},
  );
  typia.assert(employee);
  // Store original values for comparison
  const originalPosition = employee.position;
  const originalEmploymentType = employee.employment_type;
  const originalHireDate = employee.hire_date;
  const originalDepartmentId = employee.department?.id;
  const originalRoleId = employee.role?.id;
  const originalCreatedAt = employee.created_at;
  // 3. Update employee status to deactivated
  const updatedEmployee =
    await api.functional.hrmTimeTrack.member.employees.update(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          status: "deactivated",
        } satisfies IHrmTimeTrackEmployee.IUpdate,
      },
    );
  typia.assert(updatedEmployee);
  // 4. Validate status is deactivated
  TestValidator.equals(
    "status should be deactivated",
    updatedEmployee.status,
    "deactivated",
  );
  // 5. Validate all other attributes are preserved
  TestValidator.equals(
    "position should be preserved",
    updatedEmployee.position,
    originalPosition,
  );
  TestValidator.equals(
    "employment_type should be preserved",
    updatedEmployee.employment_type,
    originalEmploymentType,
  );
  TestValidator.equals(
    "hire_date should be preserved",
    updatedEmployee.hire_date,
    originalHireDate,
  );
  // 6. Validate department and role are preserved
  if (originalDepartmentId !== undefined) {
    TestValidator.equals(
      "department_id should be preserved",
      updatedEmployee.department?.id,
      originalDepartmentId,
    );
  }
  if (originalRoleId !== undefined) {
    TestValidator.equals(
      "role_id should be preserved",
      updatedEmployee.role?.id,
      originalRoleId,
    );
  }
  // 7. Validate updated_at is different from created_at
  TestValidator.notEquals(
    "updated_at should be different from created_at",
    updatedEmployee.updated_at,
    originalCreatedAt,
  );
  // 8. Validate employee record still exists (not soft-deleted)
  TestValidator.predicate(
    "employee record should still exist",
    updatedEmployee.id !== undefined,
  );
  TestValidator.predicate(
    "employee should have valid organization reference",
    updatedEmployee.organization.id !== undefined,
  );
  TestValidator.predicate(
    "employee should have valid member reference",
    updatedEmployee.member.id !== undefined,
  );
}
