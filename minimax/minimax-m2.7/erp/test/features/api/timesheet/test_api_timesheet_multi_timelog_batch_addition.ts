import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

export async function test_api_timesheet_multi_timelog_batch_addition(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Member authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  // 3. Create project with color #0000FF and active status
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#0000FF" as string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Create task with title='Development Task' and priority=high
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: "Development Task",
        priority: "high",
      },
    },
  );
  typia.assert(task);
  // 5. Create first timelog (2 hours = 120 minutes)
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: 120,
      },
    },
  );
  typia.assert(timelog1);
  // 6. Create second timelog (3 hours = 180 minutes)
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        taskId: task.id,
        date: new Date().toISOString(),
        durationMinutes: 180,
      },
    },
  );
  typia.assert(timelog2);
  // 7. Create draft timesheet with Monday-Sunday week
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
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
  // 8. Add both timelogs to timesheet via PATCH batch operation
  const updatedTimesheet =
    await api.functional.erpHrm.admin.timesheets.timelogs.update(
      adminConnection,
      {
        timesheetId: timesheet.id,
        body: {
          addTimelogIds: [timelog1.id, timelog2.id],
        } satisfies IErpHrmTimesheetTimelog.IUpdate,
      },
    );
  typia.assert(updatedTimesheet);
  // 9. Validate response - total_hours = 5.0 (120 + 180 = 300 minutes = 5 hours)
  TestValidator.equals(
    "total_hours equals 5.0",
    updatedTimesheet.total_hours,
    5.0,
  );
  TestValidator.equals("status is draft", updatedTimesheet.status, "draft");
  TestValidator.equals(
    "timesheetTimelogs contains 2 entries",
    updatedTimesheet.timesheetTimelogs.length,
    2,
  );
  // Verify both timelogs are present with correct duration_minutes values
  const timelogIds = updatedTimesheet.timesheetTimelogs.map(
    (tt) => tt.erpHrmTimelog.id,
  );
  TestValidator.predicate(
    "contains timelog1",
    timelogIds.includes(timelog1.id),
  );
  TestValidator.predicate(
    "contains timelog2",
    timelogIds.includes(timelog2.id),
  );
  const foundTimelog1 = updatedTimesheet.timesheetTimelogs.find(
    (tt) => tt.erpHrmTimelog.id === timelog1.id,
  )!;
  const foundTimelog2 = updatedTimesheet.timesheetTimelogs.find(
    (tt) => tt.erpHrmTimelog.id === timelog2.id,
  )!;
  TestValidator.equals(
    "timelog1 duration is 120 minutes",
    foundTimelog1.erpHrmTimelog.duration_minutes,
    120,
  );
  TestValidator.equals(
    "timelog2 duration is 180 minutes",
    foundTimelog2.erpHrmTimelog.duration_minutes,
    180,
  );
}
