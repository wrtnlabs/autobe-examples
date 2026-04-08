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
 * Test retrieving a terminated employee record with termination_date set.
 *
 * Validates that terminated employees (status 'deactivated' with termination_date) are still retrievable through the API endpoint and that their historical employment data is preserved. Terminated employees are only soft-deleted when deleted_at is set, not when they have a termination_date, ensuring audit trail and reporting capabilities.
 *
 * 1. Authenticate a member account for API access.
 * 2. Create an organization to scope the employee record.
 * 3. Create an employee with status 'deactivated' and termination_date in the past.
 * 4. Retrieve the terminated employee by ID.
 * 5. Validate response contains termination_date with correct value.
 * 6. Validate status is 'deactivated' and deleted_at is null.
 */
export async function test_api_employee_retrieve_terminated_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create terminated employee with deactivated status and past termination_date
  const terminationDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const hireDate = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const employee = await generate_random_hrm_time_track_member_employees_create(
    memberConnection,
    {
      body: {
        status: "deactivated",
        termination_date: terminationDate,
        hire_date: hireDate,
      },
    },
  );
  typia.assert(employee);
  // 4. Retrieve the terminated employee
  const retrieved = await api.functional.hrmTimeTrack.member.employees.at(
    memberConnection,
    {
      employeeId: employee.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate termination_date is present and correct
  TestValidator.equals(
    "termination_date matches created value",
    retrieved.termination_date,
    terminationDate,
  );
  // 6. Validate status is deactivated
  TestValidator.equals(
    "status is deactivated",
    retrieved.status,
    "deactivated",
  );
  // 7. Validate deleted_at is null (terminated but not soft-deleted)
  TestValidator.equals(
    "deleted_at is null for terminated employee",
    retrieved.deleted_at,
    null,
  );
  // 8. Validate other employee fields are intact
  TestValidator.equals("employee ID matches", retrieved.id, employee.id);
  TestValidator.equals("hire_date is preserved", retrieved.hire_date, hireDate);
  TestValidator.predicate(
    "position is not empty",
    retrieved.position.length > 0,
  );
  TestValidator.predicate(
    "employment_type is valid",
    ["full-time", "part-time", "contractor", "intern"].includes(
      retrieved.employment_type,
    ),
  );
}