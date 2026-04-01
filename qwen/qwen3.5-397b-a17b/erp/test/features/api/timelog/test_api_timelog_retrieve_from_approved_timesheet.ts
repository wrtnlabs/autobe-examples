import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import type { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { generate_random_hrm_platform_member_timelogs_create } from "../../../generate/generate_random_hrm_platform_member_timelogs_create";
import { generate_random_hrm_platform_member_timesheets_create } from "../../../generate/generate_random_hrm_platform_member_timesheets_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";
import { prepare_random_hrm_platform_timelog } from "../../../prepare/prepare_random_hrm_platform_timelog";
import { prepare_random_hrm_platform_timesheet } from "../../../prepare/prepare_random_hrm_platform_timesheet";

export async function test_api_timelog_retrieve_from_approved_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Select organization as active context
  await api.functional.hrmPlatform.member.organizations.select(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. Create project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Assign employee to project
  // Note: In this implementation, the employee ID is assumed to match the member ID
  // as the employee record is created automatically when member joins the organization
  const projectMember =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
        body: {
          hrm_platform_employee_id: authorized.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  // 6. Create timelog entry for a specific week
  const weekStart = new Date();
  // Set to Monday of current week
  const dayOfWeek = weekStart.getDay();
  const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  const timelog = await generate_random_hrm_platform_member_timelogs_create(
    memberConnection,
    {
      body: {
        date: weekStart.toISOString(),
        durationMinutes: 480,
        projectId: project.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 7. Create draft timesheet for the week (automatically includes the timelog)
  const weekStartDate = weekStart.toISOString().split("T")[0];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekEndDate = weekEnd.toISOString().split("T")[0];
  const timesheet = await generate_random_hrm_platform_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
        week_end_date: weekEndDate,
      },
    },
  );
  typia.assert(timesheet);
  // 8. Submit the timesheet for approval
  const submittedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.submit(
      memberConnection,
      {
        timesheetId: timesheet.id,
      },
    );
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status after submit",
    submittedTimesheet.status,
    "submitted",
  );
  // 9. Approve the timesheet
  const approvedTimesheet =
    await api.functional.hrmPlatform.member.timesheets.approve(
      memberConnection,
      {
        timesheetId: submittedTimesheet.id,
      },
    );
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "timesheet status after approve",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "has reviewed_at",
    approvedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "has reviewed_by_employee",
    approvedTimesheet.reviewedByEmployee !== null,
  );
  // 10. Retrieve the timelog by UUID
  const retrievedTimelog = await api.functional.hrmPlatform.member.timelogs.at(
    memberConnection,
    {
      timelogId: timelog.id,
    },
  );
  typia.assert(retrievedTimelog);
  // 11. Validate timelog response with timesheet relationship
  TestValidator.equals("timelog ID matches", retrievedTimelog.id, timelog.id);
  TestValidator.equals(
    "timelog date matches",
    retrievedTimelog.date,
    timelog.date,
  );
  TestValidator.equals(
    "timelog duration matches",
    retrievedTimelog.durationMinutes,
    timelog.durationMinutes,
  );
  TestValidator.equals(
    "timelog project matches",
    retrievedTimelog.project.id,
    project.id,
  );
  TestValidator.predicate(
    "timelog has timesheet reference",
    retrievedTimelog.timesheet !== null,
  );
  TestValidator.equals(
    "timesheet ID matches",
    retrievedTimelog.timesheet!.id,
    approvedTimesheet.id,
  );
  TestValidator.equals(
    "timesheet status is approved",
    retrievedTimelog.timesheet!.status,
    "approved",
  );
  TestValidator.predicate(
    "timesheet has submitted_at",
    retrievedTimelog.timesheet!.submitted_at !== null,
  );
  TestValidator.predicate(
    "timesheet has reviewed_at",
    retrievedTimelog.timesheet!.reviewed_at !== null,
  );
  TestValidator.predicate(
    "timesheet has reviewed_by_employee",
    retrievedTimelog.timesheet!.reviewed_by_employee !== null,
  );
}
