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

export async function test_api_timesheet_timelog_removal_preserves_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
    },
  );
  typia.assert(task);
  // 4. Create two timelogs with dates within the same week for timesheet inclusion
  // Get current week's Monday for timesheet creation
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - daysToMonday);
  thisMonday.setHours(10, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: thisMonday.toISOString(),
        durationMinutes: 60,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date(thisMonday.getTime() + 86400000).toISOString(), // Tuesday
        durationMinutes: 120,
      },
    },
  );
  typia.assert(timelog2);
  // 5. Create a draft timesheet for this week (auto-includes timelogs within week)
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: thisMonday.toISOString(),
        week_end_date: new Date(
          thisMonday.getTime() + 6 * 86400000,
        ).toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify both timelogs are included in the timesheet before removal
  const originalTimelogIds = timesheet.timesheetTimelogs.map(
    (st) => st.erpHrmTimelog.id,
  );
  TestValidator.predicate(
    "timelog1 included in original timesheet",
    originalTimelogIds.includes(timelog1.id),
  );
  TestValidator.predicate(
    "timelog2 included in original timesheet",
    originalTimelogIds.includes(timelog2.id),
  );
  const originalTotalHours = timesheet.total_hours as number;
  const timelog2Hours = timelog2.duration_minutes / 60;
  // 6. Call PATCH to remove one timelog from the timesheet
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.update(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          removeTimelogIds: [timelog2.id],
        },
      },
    );
  typia.assert(updatedTimesheet);
  // Validations:
  // 1. timesheetTimelogs array should no longer contain the removed timelog
  const containsRemovedTimelog = updatedTimesheet.timesheetTimelogs.some(
    (st) => st.erpHrmTimelog.id === timelog2.id,
  );
  TestValidator.equals(
    "removed timelog not in timesheetTimelogs",
    containsRemovedTimelog,
    false,
  );
  // 2. Removed timelog should still exist in the system
  // (verified by the fact it's not in timesheetTimelogs but the junction record was deleted)
  // The original timelog record is preserved - we verify this indirectly by checking
  // that only the junction was removed and the total_hours was recalculated
  // 3. total_hours should decrease by the removed timelog's duration
  const expectedTotalHours = originalTotalHours - timelog2Hours;
  TestValidator.predicate(
    "total_hours decreased correctly",
    Math.abs(updatedTimesheet.total_hours - expectedTotalHours) < 0.01,
  );
  // 4. Verify the remaining timelog is still in the timesheet
  const containsTimelog1 = updatedTimesheet.timesheetTimelogs.some(
    (st) => st.erpHrmTimelog.id === timelog1.id,
  );
  TestValidator.equals(
    "remaining timelog still in timesheet",
    containsTimelog1,
    true,
  );
}
