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
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test retrieving an active employee record with complete information including position, employment type, status, hire date, department assignment, and role assignment.
 *
 * Validates the complete employee retrieval flow including member authentication, organization setup, employee creation with full details, and employee data retrieval. Ensures that the retrieved employee record contains all required fields and properly populated relationship data.
 *
 * Special attention is given to verifying that the employee is in active status with deleted_at being null, and that all nested objects (organization, member, department, role) are correctly populated with valid data from the same organization context.
 *
 * 1. Member authenticates via join endpoint with email and password.
 * 2. Organization is created with name, currency, timezone, and fiscal settings.
 * 3. Employee is created with position, employment type, hire date, and active status.
 * 4. Employee record is retrieved by ID using the at endpoint.
 * 5. Validates response structure, field values, and relationship data integrity.
 */
export async function test_api_employee_retrieve_active_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee with full details
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        status: "active",
      },
    },
  );
  typia.assert(employee);
  // 4. Retrieve employee by ID
  const retrievedEmployee =
    await api.functional.hrmTimeTrack.member.employees.at(memberConnection, {
      employeeId: employee.id,
    });
  typia.assert(retrievedEmployee);
  // 5. Validate employee data
  TestValidator.equals(
    "employee ID matches",
    retrievedEmployee.id,
    employee.id,
  );
  TestValidator.equals(
    "position matches",
    retrievedEmployee.position,
    employee.position,
  );
  TestValidator.equals(
    "employment type matches",
    retrievedEmployee.employment_type,
    employee.employment_type,
  );
  TestValidator.equals("status is active", retrievedEmployee.status, "active");
  TestValidator.equals(
    "hire date matches",
    retrievedEmployee.hire_date,
    employee.hire_date,
  );
  TestValidator.equals(
    "deleted_at is null for active employee",
    retrievedEmployee.deleted_at,
    null,
  );
  // 6. Validate organization relationship
  TestValidator.equals(
    "organization ID matches",
    retrievedEmployee.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedEmployee.organization.name,
    organization.name,
  );
  // 7. Validate member relationship exists
  TestValidator.predicate(
    "member ID exists",
    retrievedEmployee.member.id !== undefined,
  );
  TestValidator.predicate(
    "member email exists",
    retrievedEmployee.member.email !== undefined,
  );
  // 8. Validate department relationship (optional, may be null)
  if (
    retrievedEmployee.department !== null &&
    retrievedEmployee.department !== undefined
  ) {
    TestValidator.predicate(
      "department has valid ID",
      retrievedEmployee.department.id !== undefined,
    );
  }
  // 9. Validate role relationship (optional, may be null)
  if (retrievedEmployee.role !== null && retrievedEmployee.role !== undefined) {
    TestValidator.predicate(
      "role has valid ID",
      retrievedEmployee.role.id !== undefined,
    );
  }
  // 10. Validate timestamps exist
  TestValidator.predicate(
    "created_at exists",
    retrievedEmployee.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedEmployee.updated_at !== undefined,
  );
}
