import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import type { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import type { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_add_and_total_hours_calculation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. The authenticated member is automatically added as a member to their own project
  // So we can directly create tasks and timelogs
  // 4. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
      },
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // 5. Create a timelog
  const now = new Date();
  const timelogDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
  const durationMinutes = 120; // 2 hours
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: timelogDate.toISOString(),
        durationMinutes: durationMinutes,
        description: "Test timelog for timesheet",
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 6. Create a draft timesheet with week matching the timelog date
  // Get Monday of the week containing the timelog date
  const timelogDayOfWeek = timelogDate.getDay();
  const daysToMonday = timelogDayOfWeek === 0 ? 6 : timelogDayOfWeek - 1;
  const monday = new Date(timelogDate);
  monday.setDate(timelogDate.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
        week_end_date: sunday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 7. Call PATCH /erpHrm/member/timesheets/{timesheetId}/timelogs with addTimelogIds
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          addTimelogIds: [timelog.id],
        },
      },
    );
  typia.assert(updatedTimesheet);
  // Validations
  TestValidator.predicate(
    "timesheet should still be in draft status",
    updatedTimesheet.status === "draft",
  );
  TestValidator.predicate(
    "timesheetTimelogs should contain the added timelog",
    updatedTimesheet.timesheetTimelogs.some(
      (ttl) => ttl.erpHrmTimelog.id === timelog.id,
    ),
  );
  // Total hours should be duration_minutes / 60
  const expectedTotalHours = durationMinutes / 60;
  TestValidator.equals(
    "total_hours should reflect timelog duration converted to hours",
    updatedTimesheet.total_hours,
    expectedTotalHours,
  );
  TestValidator.predicate(
    "response should include employee information",
    updatedTimesheet.employee !== undefined &&
      updatedTimesheet.employee !== null,
  );
}