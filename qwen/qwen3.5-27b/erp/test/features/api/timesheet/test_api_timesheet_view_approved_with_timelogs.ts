import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackEmployee";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IHrmTimeTrackProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProject";
import type { IHrmTimeTrackProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackProjectMember";
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
import { generate_random_hrm_time_track_member_projects_create } from "../../../generate/generate_random_hrm_time_track_member_projects_create";
import { generate_random_hrm_time_track_member_timelogs_create } from "../../../generate/generate_random_hrm_time_track_member_timelogs_create";
import { generate_random_hrm_time_track_member_timesheets_create } from "../../../generate/generate_random_hrm_time_track_member_timesheets_create";
import { prepare_random_hrm_time_track_employee } from "../../../prepare/prepare_random_hrm_time_track_employee";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";
import { prepare_random_hrm_time_track_project } from "../../../prepare/prepare_random_hrm_time_track_project";
import { prepare_random_hrm_time_track_timelog } from "../../../prepare/prepare_random_hrm_time_track_timelog";
import { prepare_random_hrm_time_track_timesheet } from "../../../prepare/prepare_random_hrm_time_track_timesheet";

/**
 * Test that an employee can view their approved timesheet and verify timelogs are locked.
 *
 * Validates the complete timesheet approval workflow including member authentication, organization setup, employee record creation, timelog creation, timesheet submission, and approval. Ensures that approved timesheets correctly display all associated timelogs with locked status.
 *
 * Special attention is given to verifying that the timesheet status transitions correctly through the approval workflow (draft → submitted → approved), that the approver information is recorded, and that all timelogs reflect the approved status indicating they are locked from editing.
 *
 * 1. Member registers and authenticates for the organization.
 * 2. Creates an organization with required settings.
 * 3. Creates an employee record linking the member to the organization.
 * 4. Creates a project for timelog association.
 * 5. Creates multiple timelogs for the employee within a specific week.
 * 6. Creates a draft timesheet for that week.
 * 7. Submits the timesheet for approval.
 * 8. Approves the timesheet with approver information.
 * 9. Retrieves the approved timesheet and validates all fields.
 */
export async function test_api_timesheet_view_approved_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmTimeTrackMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmTimeTrackMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization: IHrmTimeTrackOrganization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create employee record with correct member ID
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
  // 4. Create project
  const project: IHrmTimeTrackProject =
    await generate_random_hrm_time_track_member_projects_create(
      memberConnection,
      {},
    );
  typia.assert(project);
  // 5. Create timelogs for a specific week
  const weekStartDate: Date = new Date("2024-01-08T00:00:00Z"); // Monday
  const timelogs: IHrmTimeTrackTimelog[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const timelog: IHrmTimeTrackTimelog =
        await generate_random_hrm_time_track_member_timelogs_create(
          memberConnection,
          {
            body: {
              date: new Date(
                weekStartDate.getTime() + index * 24 * 60 * 60 * 1000,
              ).toISOString(),
              duration_seconds: 28800 + index * 3600, // 8 hours + index hours
              hrm_time_track_project_id: project.id,
              billable: true,
            },
          },
        );
      typia.assert(timelog);
      return timelog;
    },
  );
  // 6. Create draft timesheet for the week
  const timesheet: IHrmTimeTrackTimesheet =
    await generate_random_hrm_time_track_member_timesheets_create(
      memberConnection,
      {
        body: {
          week_start_date: weekStartDate.toISOString(),
        },
      },
    );
  typia.assert(timesheet);
  // 7. Submit the timesheet
  const submittedTimesheet: IHrmTimeTrackTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "submitted",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(submittedTimesheet);
  // 8. Approve the timesheet
  const approvedTimesheet: IHrmTimeTrackTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          status: "approved",
        } satisfies IHrmTimeTrackTimesheet.IUpdate,
      },
    );
  typia.assert(approvedTimesheet);
  // 9. Retrieve the approved timesheet
  const retrievedTimesheet: IHrmTimeTrackTimesheet =
    await api.functional.hrmTimeTrack.member.timesheets.at(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(retrievedTimesheet);
  // 10. Validate timesheet fields
  TestValidator.equals(
    "status is approved",
    retrievedTimesheet.status,
    "approved",
  );
  TestValidator.equals(
    "employee matches",
    retrievedTimesheet.employee.id,
    employee.id,
  );
  TestValidator.equals(
    "week start date matches",
    retrievedTimesheet.week_start_date,
    weekStartDate.toISOString(),
  );
  TestValidator.predicate("has approver", retrievedTimesheet.approver !== null);
  TestValidator.predicate(
    "has approved_at timestamp",
    retrievedTimesheet.approved_at !== null,
  );
  TestValidator.equals(
    "rejected_at is null",
    retrievedTimesheet.rejected_at,
    null,
  );
  TestValidator.equals(
    "rejection_reason is null",
    retrievedTimesheet.rejection_reason,
    null,
  );
  TestValidator.equals("timelogs count", retrievedTimesheet.timelogs.length, 3);
  // 11. Validate all timelogs have approved status (locked)
  await ArrayUtil.asyncForEach(retrievedTimesheet.timelogs, async (timelog) => {
    TestValidator.equals(
      "timelog timesheet_status is approved",
      timelog.timesheet_status,
      "approved",
    );
  });
}
