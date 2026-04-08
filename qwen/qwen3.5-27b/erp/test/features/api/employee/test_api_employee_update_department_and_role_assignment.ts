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
import { generate_random_hrm_time_track_member_departments_create } from "../../../generate/generate_random_hrm_time_track_member_departments_create";
import { generate_random_hrm_time_track_member_employees_create } from "../../../generate/generate_random_hrm_time_track_member_employees_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { generate_random_hrm_time_track_member_roles_create } from "../../../generate/generate_random_hrm_time_track_member_roles_create";
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_role } from "../../../prepare/prepare_random_hrm_time_track_role";

/**
 * Test updating an employee's department and role assignments within the same organization.
 *
 * Validates the complete employee update workflow including department reassignment and role changes. Ensures that department and role references can be modified independently while maintaining the organizational relationship. Special attention is given to verifying that both department and role assignments are correctly updated and that the organization reference remains unchanged throughout the updates.
 *
 * 1. Authenticate as a member to access HRM operations.
 * 2. Create an organization with currency, timezone, and fiscal settings.
 * 3. Create two departments for testing department reassignment.
 * 4. Create two roles with different permissions for testing role changes.
 * 5. Create an employee with initial department and role assignments.
 * 6. Update the employee's department to the second department.
 * 7. Update the employee's role to the second role.
 * 8. Verify that department reference points to the new department.
 * 9. Verify that role reference points to the new role.
 * 10. Confirm that organization relationship remains unchanged.
 */
export async function test_api_employee_update_department_and_role_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "Test Organization",
        },
      },
    );
  typia.assert(organization);
  // 3. Create first department
  const department1 =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering Department",
        },
      },
    );
  typia.assert(department1);
  // 4. Create second department
  const department2 =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Marketing Department",
        },
      },
    );
  typia.assert(department2);
  // 5. Create first role
  const role1 = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Developer",
        permissions: ["employee_viewing", "time_viewing_all"],
      },
    },
  );
  typia.assert(role1);
  // 6. Create second role
  const role2 = await generate_random_hrm_time_track_member_roles_create(
    memberConnection,
    {
      body: {
        name: "Manager",
        permissions: [
          "employee_management",
          "employee_viewing",
          "time_management",
        ],
      },
    },
  );
  typia.assert(role2);
  // 7. Create employee with initial department and role
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        position: "Software Engineer",
        employment_type: "full-time",
        hire_date: new Date().toISOString(),
        hrm_time_track_department_id: department1.id,
        hrm_time_track_role_id: role1.id,
      },
    },
  );
  typia.assert(employee);
  // Verify initial assignments
  TestValidator.equals(
    "initial department matches",
    employee.department?.id,
    department1.id,
  );
  TestValidator.equals("initial role matches", employee.role?.id, role1.id);
  TestValidator.equals(
    "organization unchanged initially",
    employee.organization.id,
    organization.id,
  );
  // 8. Update employee's department to second department
  const updatedEmployee1 =
    await api.functional.hrmTimeTrack.member.employees.update(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          department_id: department2.id,
        } satisfies IHrmTimeTrackEmployee.IUpdate,
      },
    );
  typia.assert(updatedEmployee1);
  // Verify department update
  TestValidator.equals(
    "department updated to second department",
    updatedEmployee1.department?.id,
    department2.id,
  );
  TestValidator.equals(
    "role unchanged after department update",
    updatedEmployee1.role?.id,
    role1.id,
  );
  TestValidator.equals(
    "organization unchanged after department update",
    updatedEmployee1.organization.id,
    organization.id,
  );
  // 9. Update employee's role to second role
  const updatedEmployee2 =
    await api.functional.hrmTimeTrack.member.employees.update(
      memberConnection,
      {
        employeeId: employee.id,
        body: {
          role_id: role2.id,
        } satisfies IHrmTimeTrackEmployee.IUpdate,
      },
    );
  typia.assert(updatedEmployee2);
  // Verify role update
  TestValidator.equals(
    "role updated to second role",
    updatedEmployee2.role?.id,
    role2.id,
  );
  TestValidator.equals(
    "department remains second department",
    updatedEmployee2.department?.id,
    department2.id,
  );
  TestValidator.equals(
    "organization unchanged after role update",
    updatedEmployee2.organization.id,
    organization.id,
  );
}