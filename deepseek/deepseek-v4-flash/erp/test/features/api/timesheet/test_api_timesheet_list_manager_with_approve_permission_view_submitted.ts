import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProjectMember";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import type { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_projects_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_create";
import { generate_random_hrm_time_tracking_member_projects_members_create } from "../../../generate/generate_random_hrm_time_tracking_member_projects_members_create";
import { generate_random_hrm_time_tracking_member_timelogs_create } from "../../../generate/generate_random_hrm_time_tracking_member_timelogs_create";
import { generate_random_hrm_time_tracking_member_timesheets_create } from "../../../generate/generate_random_hrm_time_tracking_member_timesheets_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_project } from "../../../prepare/prepare_random_hrm_time_tracking_project";
import { prepare_random_hrm_time_tracking_project_member } from "../../../prepare/prepare_random_hrm_time_tracking_project_member";
import { prepare_random_hrm_time_tracking_timelog } from "../../../prepare/prepare_random_hrm_time_tracking_timelog";
import { prepare_random_hrm_time_tracking_timesheet } from "../../../prepare/prepare_random_hrm_time_tracking_timesheet";

/**
 * Test that the organization owner (with built-in Owner role which includes time:approve permission) can view submitted timesheets by filtering with status='submitted'.
 *
 * Validates the complete timesheet lifecycle workflow including member registration, organization creation, project setup, employee addition, timelog creation, timesheet creation, submission, and list filtering.
 *
 * 1. Register as a member via authorize_member_join
 * 2. Create an organization via generate_random_hrm_time_tracking_member_organizations_create — owner gets Owner role with time:approve permission
 * 3. Re-login to get the owner's employee record (created upon organization creation)
 * 4. Create a project via generate_random_hrm_time_tracking_member_projects_create
 * 5. Add the owner employee as a project member
 * 6. Create timelog(s) via generate_random_hrm_time_tracking_member_timelogs_create for the current week
 * 7. Create a draft timesheet via generate_random_hrm_time_tracking_member_timesheets_create with week_start_date = current Monday
 * 8. Submit the draft timesheet via api.functional.hrmTimeTracking.member.timesheets.submit — transitions status to 'submitted'
 * 9. Call PATCH /hrmTimeTracking/member/timesheets with { status: 'submitted' }
 *
 * Validation:
 * - Response returns paginated list of timesheets with status = 'submitted'
 * - The submitted timesheet is returned with submitted_at timestamp populated
 * - Employee summary is present on each timesheet record
 * - Pagination metadata reflects the filtered results (records >= 1)
 * - Results are sorted by week_start_date descending (most recent first)
 */
export async function test_api_timesheet_list_manager_with_approve_permission_view_submitted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register as a member who will become the organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(owner);
  // Step 2: Create an organization — owner gets Owner role with time:approve permission
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Re-login to get the owner's employee record (created upon organization creation)
  const ownerSession: api.IConnection = { host: connection.host };
  const refreshedOwner = await authorize_member_login(ownerSession, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(refreshedOwner);
  // Copy auth token from refreshed session back to ownerConnection
  ownerConnection.headers = ownerSession.headers;
  // The owner now has an employee record in the newly created organization
  const employeeId = refreshedOwner.employees[0].id;
  // Step 4: Create a project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      ownerConnection,
      {},
    );
  typia.assert(project);
  // Step 5: Add the owner's employee record as a project member
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      ownerConnection,
      {
        body: {
          employee_id: employeeId,
          role: "member" as const,
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // Step 6: Calculate the current week's Monday
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const mondayIso = monday.toISOString();
  // Create timelog(s) for the current week
  const durationMinutes = 60 satisfies number as number;
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      ownerConnection,
      {
        body: {
          date: mondayIso,
          duration_minutes: durationMinutes,
          project_id: project.id,
        },
      },
    );
  typia.assert(timelog);
  // Step 7: Create a draft timesheet for the current week
  const weekStartDate = mondayIso.split("T")[0];
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      ownerConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // Step 8: Submit the draft timesheet — transitions status to 'submitted'
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      ownerConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  // Step 9: List timesheets with status='submitted'
  const page = await api.functional.hrmTimeTracking.member.timesheets.index(
    ownerConnection,
    {
      body: {
        status: "submitted",
      } satisfies IHrmTimeTrackingTimesheet.IRequest,
    },
  );
  typia.assert(page);
  // Validation: pagination records >= 1
  TestValidator.predicate(
    "pagination records >= 1",
    page.pagination.records >= 1,
  );
  // Validation: submitted timesheet returned in results
  const found = page.data.find(
    (ts: IHrmTimeTrackingTimesheet.ISummary) => ts.id === timesheet.id,
  );
  TestValidator.predicate("submitted timesheet returned", found !== undefined);
  // Validation: submitted_at is populated on the found timesheet
  TestValidator.predicate(
    "submitted_at is populated",
    found!.submitted_at !== null,
  );
  // Validation: employee summary present on each record
  TestValidator.predicate(
    "employee summary present on each record",
    page.data.every(
      (ts: IHrmTimeTrackingTimesheet.ISummary) => ts.employee !== null,
    ),
  );
  // Validation: results sorted by week_start_date descending
  TestValidator.predicate(
    "results sorted by week_start_date descending",
    (() => {
      for (let i = 1; i < page.data.length; i++) {
        if (page.data[i - 1].week_start_date < page.data[i].week_start_date) {
          return false;
        }
      }
      return true;
    })(),
  );
}
