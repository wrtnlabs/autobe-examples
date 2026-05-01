import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test timesheet creation with automatic inclusion of ungrouped timelogs.
 *
 * Validates that creating a draft timesheet for a Monday-to-Sunday week correctly auto-associates all ungrouped timelogs belonging to the authenticated employee within that date range. The test verifies the core server-side behavior: timelogs with timesheet_id IS NULL and dates falling between week_start_date and week_end_date are automatically linked to the newly created timesheet.
 *
 * The test also confirms that the timesheet is created in draft status (not submitted or approved), and that each previously ungrouped timelog now references the correct timesheet. The timelogs remain editable in draft status — locking occurs only on approval.
 *
 * 1. Authenticate a member via join, creating the organization and employee context.
 * 2. Create an active project and add the authenticated employee as a project member.
 * 3. Log three timelog entries against the project on Monday, Tuesday, and Wednesday of the most recent calendar week.
 * 4. Create a draft timesheet with the computed Monday as week_start_date.
 * 5. Validate the timesheet is in draft status and contains the three previously created timelogs, each now linked to the timesheet.
 */
export async function test_api_timesheet_create_with_ungrouped_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Add authenticated employee as project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      memberConnection,
      {
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 4. Compute the most recent Monday and related week dates
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  const tuesday = new Date(monday);
  tuesday.setDate(monday.getDate() + 1);
  const wednesday = new Date(monday);
  wednesday.setDate(monday.getDate() + 2);
  const formatDate = (d: Date): string => d.toISOString().split("T")[0];
  const formatDateTime = (d: Date): string => d.toISOString();
  // 5. Create ungrouped timelogs on Mon, Tue, Wed
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: formatDate(monday) as string & tags.Format<"date">,
        duration_minutes: 120 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: formatDate(tuesday) as string & tags.Format<"date">,
        duration_minutes: 90 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: formatDate(wednesday) as string & tags.Format<"date">,
        duration_minutes: 60 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
      },
    },
  );
  typia.assert(timelog3);
  // 6. Create timesheet for the week starting Monday
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: formatDateTime(monday) as string &
          tags.Format<"date-time">,
      },
    },
  );
  typia.assert(timesheet);
  // 7. Validate timesheet status and timelog auto-inclusion
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "timesheet contains at least 3 timelogs",
    timesheet.timelogs.length >= 3,
  );
  const totalMinutes = timesheet.timelogs.reduce(
    (sum, tl) => sum + tl.duration_minutes,
    0,
  );
  const totalHours = totalMinutes / 60;
  TestValidator.predicate("computed total hours is positive", totalHours > 0);
  for (const timelog of timesheet.timelogs) {
    TestValidator.equals(
      "timelog is linked to the created timesheet",
      timelog.timesheet?.id,
      timesheet.id,
    );
  }
}
