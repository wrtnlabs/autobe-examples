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
 * Test that a user cannot approve their own submitted timesheet.
 *
 * Validates Section 323's business rule prohibiting self-approval. A single member account is registered and becomes the organization Owner (with `time:approve` permission). After creating a project, logging time, creating and submitting a timesheet, the same member attempts to approve their own timesheet — the system must reject this with HTTP 403 Forbidden.
 *
 * 1. Register member with known credentials.
 * 2. Create organization (member becomes Owner with `time:approve`).
 * 3. Re-authenticate to fetch fresh profile including auto-created employee record.
 * 4. Create an active project.
 * 5. Add self as project member.
 * 6. Log a timelog against the project for the current work week.
 * 7. Create a draft timesheet for the same week.
 * 8. Submit the draft timesheet.
 * 9. Attempt self-approval — expect 403 Forbidden.
 */
export async function test_api_timesheet_self_approval_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account with known credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joinResult = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    },
  });
  typia.assert(joinResult);
  // 2. Create organization — member becomes Owner with time:approve permission
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Re-authenticate to get fresh profile with auto-created employee record
  const freshConnection: api.IConnection = { host: connection.host };
  const freshAuth = await authorize_member_login(freshConnection, {
    body: {
      email,
      password,
      href: "https://example.com/login",
      referrer: "https://example.com/",
    },
  });
  typia.assert(freshAuth);
  const employeeId = freshAuth.employees[0].id;
  // 4. Create an active project
  const project =
    await generate_random_hrm_time_tracking_member_projects_create(
      freshConnection,
      {},
    );
  typia.assert(project);
  // 5. Add self as project member
  const projectMember =
    await generate_random_hrm_time_tracking_member_projects_members_create(
      freshConnection,
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
  // 6. Calculate current Monday for timelog and timesheet dates
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  // 7. Create a timelog against the project on Monday
  const timelog =
    await generate_random_hrm_time_tracking_member_timelogs_create(
      freshConnection,
      {
        body: {
          date: monday.toISOString(),
          duration_minutes: 60,
          project_id: project.id,
          billable: true,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(timelog);
  // 8. Create a draft timesheet covering the current work week
  const weekStartDate = monday.toISOString().split("T")[0];
  const timesheet =
    await generate_random_hrm_time_tracking_member_timesheets_create(
      freshConnection,
      {
        body: {
          week_start_date: weekStartDate,
        },
      },
    );
  typia.assert(timesheet);
  // 9. Submit the draft timesheet
  const submittedTimesheet =
    await api.functional.hrmTimeTracking.member.timesheets.submit(
      freshConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 10. Attempt self-approval — must fail with 403 Forbidden
  await TestValidator.httpError("self-approval forbidden", 403, async () => {
    await api.functional.hrmTimeTracking.member.timesheets.approve(
      freshConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  });
}
