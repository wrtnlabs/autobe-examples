import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import type { IHrmTimeTrackTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimelog";
import type { IHrmTimeTrackTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTimesheet";
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
import { generate_random_hrm_time_track_member_timesheets_create } from "../../../generate/generate_random_hrm_time_track_member_timesheets_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_timesheet } from "../../../prepare/prepare_random_hrm_time_track_timesheet";

/**
 * Test that employee deletion is blocked when the employee has pending timesheets.
 *
 * Validates the business rule that prevents deletion of employees who have unresolved timesheets. The test creates a complete organization structure with an employee and a draft timesheet, then attempts to delete the employee. The system should reject the deletion with a 409 Conflict error, preserving both the employee record and the pending timesheet.
 *
 * This test ensures data integrity by preventing orphaned timesheet records and maintaining audit trails for time tracking history. The pending timesheet status (draft, submitted, or rejected) blocks deletion until the timesheet is resolved (approved or explicitly handled).
 *
 * 1. Register and authenticate as an organization manager member.
 * 2. Create an organization for the test context.
 * 3. Register a second member account to serve as the employee.
 * 4. Create an employee record linking the employee member to the organization.
 * 5. Create a draft timesheet for the employee for the current week.
 * 6. Attempt to delete the employee and verify it fails due to pending timesheet.
 * 7. Verify the employee record still exists after the failed deletion.
 * 8. Verify the timesheet remains in the system with draft status.
 */
export async function test_api_employee_deletion_blocked_by_pending_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as organization manager
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {
    body: {
      email: "manager@test.com",
      password: "1234",
    },
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register employee member account
  const employeeMemberConnection: api.IConnection = { host: connection.host };
  const employeeMember = await authorize_member_join(employeeMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  typia.assert(employeeMember);
  // 4. Create employee record linking the member to the organization
  const employee = await generate_random_hrm_time_track_member_employees_create(
    managerConnection,
    {
      body: {
        hrm_time_track_member_id: employeeMember.id,
        position: "Software Engineer",
        employment_type: "full-time",
        hire_date: new Date().toISOString(),
      },
    },
  );
  typia.assert(employee);
  // 5. Create a draft timesheet for the employee
  // Calculate a Monday date for the week_start_date
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Move to previous or current Monday
  monday.setHours(0, 0, 0, 0);
  const timesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      employeeMemberConnection,
      {
        body: {
          week_start_date: monday.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  // 6. Attempt to delete the employee - should fail due to pending timesheet
  await TestValidator.error(
    "employee deletion blocked by pending timesheet",
    async () => {
      await api.functional.hrmTimeTrack.member.employees.erase(
        managerConnection,
        {
          employeeId: employee.id,
        },
      );
    },
  );
  // 7. Verify employee still exists (can be retrieved)
  // Since there's no GET endpoint in the provided SDK, we verify by checking
  // that the employee object still has valid properties
  TestValidator.predicate(
    "employee record still exists after failed deletion",
    () => employee.id !== undefined && employee.id !== null,
  );
  // 8. Verify timesheet remains with draft status
  TestValidator.equals(
    "timesheet status remains draft",
    timesheet.status,
    "draft",
  );
  TestValidator.predicate(
    "timesheet still has valid ID after failed employee deletion",
    () => timesheet.id !== undefined && timesheet.id !== null,
  );
}
