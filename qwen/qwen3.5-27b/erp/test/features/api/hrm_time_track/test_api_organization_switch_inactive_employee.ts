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
 * Test organization switching when the user's employee record is deactivated in the target organization.
 *
 * Validates that the organization switch endpoint correctly rejects requests when the authenticated user's employee record in the target organization has been deactivated. This ensures that only users with active employment status can switch their organization context.
 *
 * The test verifies the business rule that an active employee record is required to switch to an organization, preventing deactivated employees from accessing organization resources.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create a target organization for testing.
 * 3. Create an employee record linking the member to the target organization with active status.
 * 4. Deactivate the employee record by updating status to 'deactivated'.
 * 5. Attempt to switch to the target organization.
 * 6. Verify the switch operation fails with an appropriate error.
 */
export async function test_api_organization_switch_inactive_employee(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmTimeTrackMember.IAuthorized =
    await authorize_member_join(memberConnection);
  typia.assert(memberAuth);
  // 2. Create target organization
  const organization: IHrmTimeTrackOrganization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee record with active status
  const employee: IHrmTimeTrackEmployee =
    await generate_random_hrm_time_track_member_employees_create(
      memberConnection,
      {
        body: {
          hrm_time_track_member_id: memberAuth.id,
        },
      },
    );
  typia.assert(employee);
  // 4. Deactivate the employee record
  const updatedEmployee: IHrmTimeTrackEmployee =
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
  // Verify employee is now deactivated
  TestValidator.equals(
    "employee status is deactivated",
    updatedEmployee.status,
    "deactivated",
  );
  // 5. Attempt to switch to the organization with deactivated employee
  await TestValidator.error(
    "switch fails with deactivated employee",
    async () => {
      await api.functional.hrmTimeTrack.member.organizations._switch.switchContext(
        memberConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
}
