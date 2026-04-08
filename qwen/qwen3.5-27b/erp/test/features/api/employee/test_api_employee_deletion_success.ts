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
 * Test the primary success path for deleting an employee from an organization.
 *
 * Validates the complete employee deletion workflow including member authentication, organization setup, employee creation, and successful deletion. Ensures that the employee record can be deleted when there are no active contracts or pending timesheets.
 *
 * Special attention is given to verifying that the deletion operation completes successfully without errors and returns the expected void response (204 No Content).
 *
 * 1. Register and authenticate as an organization manager member.
 * 2. Create an organization for the test context.
 * 3. Register a second member account to serve as the employee.
 * 4. Create an employee record linking the employee member to the organization.
 * 5. Delete the employee record using the employee ID.
 * 6. Validate that the deletion completes successfully without errors.
 */
export async function test_api_employee_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as organization manager
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: "manager@test.com",
      password: "1234",
    },
  });
  typia.assert(managerAuth);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register a second member as the employee
  const employeeAuth = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: "employee@test.com",
        password: "1234",
      },
    },
  );
  typia.assert(employeeAuth);
  // 4. Create an employee record linking the employee to the organization
  const employee = await generate_random_hrm_time_track_member_employees_create(
    managerConnection,
    {
      body: {
        hrm_time_track_member_id: employeeAuth.id,
        position: "Software Developer",
        employment_type: "full-time",
        hire_date: new Date().toISOString(),
        status: "active",
      },
    },
  );
  typia.assert(employee);
  // 5. Delete the employee record
  await api.functional.hrmTimeTrack.member.employees.erase(managerConnection, {
    employeeId: employee.id,
  });
  // 6. Validation: The deletion completes successfully when no error is thrown
  // The void response (204 No Content) indicates successful deletion
  // No additional validation needed - successful execution is the validation
}
