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
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_removal_from_draft(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a project for timelog association
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Test Project",
        color: "#FF5733" satisfies string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 3. Create a task for detailed timelog
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Test Task",
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 4. Create a timelog entry to be removed from timesheet
  const durationMinutes = 60;
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: durationMinutes,
      },
    },
  );
  typia.assert(timelog);
  // 5. Create a draft timesheet for the work week (Monday to Sunday)
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + sundayOffset);
  weekEnd.setHours(23, 59, 59, 999);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStart.toISOString(),
        week_end_date: weekEnd.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Validate initial timesheet state
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  // 6. Add timelog to timesheet
  const timesheetWithTimelog =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          erp_hrm_timelog_id: timelog.id,
        },
      },
    );
  typia.assert(timesheetWithTimelog);
  // Find the timesheet timelog junction id
  const timesheetTimelog = timesheetWithTimelog.timesheetTimelogs.find(
    (st) => st.erpHrmTimelog.id === timelog.id,
  );
  if (!timesheetTimelog) {
    throw new Error("Timelog not found in timesheet");
  }
  // Store initial total hours
  const initialTotalHours = timesheetWithTimelog.total_hours;
  const initialTimelogsCount = timesheetWithTimelog.timesheetTimelogs.length;
  TestValidator.predicate(
    "timesheet has hours after adding timelog",
    initialTotalHours > 0,
  );
  // 7. Remove timelog from timesheet (DELETE endpoint - returns void/204 No Content)
  await api.functional.erpHrm.member.timesheets.timelogs.erase(
    memberConnection,
    {
      timesheetId: timesheet.id,
      timesheetTimelogId: timesheetTimelog.id,
    },
  );
  // 8. Verify timelog still exists in system by recreating timesheet
  // When recreating a timesheet, it auto-includes all unlinked timelogs
  const recreatedTimesheet =
    await api.functional.erpHrm.member.timesheets.create(memberConnection, {
      body: {
        week_start_date: weekStart.toISOString(),
        week_end_date: weekEnd.toISOString(),
      },
    });
  typia.assert(recreatedTimesheet);
  // Verify timesheet status remains 'draft'
  TestValidator.equals(
    "timesheet status remains draft after removal",
    recreatedTimesheet.status,
    "draft",
  );
  // Verify timelog is auto-included in recreated timesheet (proves it still exists)
  const timelogInRecreated = recreatedTimesheet.timesheetTimelogs.find(
    (st) => st.erpHrmTimelog.id === timelog.id,
  );
  TestValidator.predicate(
    "timelog still exists in system and is auto-included",
    timelogInRecreated !== undefined,
  );
  // Verify total hours match expected value after removal
  TestValidator.equals(
    "total hours after removal matches",
    recreatedTimesheet.total_hours,
    initialTotalHours,
  );
}
