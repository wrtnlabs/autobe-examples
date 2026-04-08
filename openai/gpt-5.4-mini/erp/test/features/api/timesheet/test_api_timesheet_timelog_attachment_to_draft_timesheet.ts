import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import type { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import type { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_member_projects_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_create";
import { generate_random_erp_hrm_time_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_time_member_projects_tasks_create";
import { generate_random_erp_hrm_time_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timelogs_create";
import { generate_random_erp_hrm_time_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_create";
import { generate_random_erp_hrm_time_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_time_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_time_project } from "../../../prepare/prepare_random_erp_hrm_time_project";
import { prepare_random_erp_hrm_time_task_history_entry } from "../../../prepare/prepare_random_erp_hrm_time_task_history_entry";
import { prepare_random_erp_hrm_time_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timelog";
import { prepare_random_erp_hrm_time_timesheet } from "../../../prepare/prepare_random_erp_hrm_time_timesheet";
import { prepare_random_erp_hrm_time_timesheet_timelog } from "../../../prepare/prepare_random_erp_hrm_time_timesheet_timelog";

export async function test_api_timesheet_timelog_attachment_to_draft_timesheet(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: joined.token.access,
  };
  const project = await generate_random_erp_hrm_time_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        colorCode: "#3366ff",
        status: "active",
        budgetHours: 40,
      } satisfies IErpHrmTimeProject.ICreate,
    },
  );
  typia.assert(project);
  const task = await generate_random_erp_hrm_time_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        priority: "medium",
        status: "open",
      } satisfies IErpHrmTimeTaskHistoryEntry.ICreate,
    },
  );
  typia.assert(task);
  const now = new Date();
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + mondayOffset,
      0,
      0,
      0,
      0,
    ),
  );
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  weekEnd.setUTCHours(23, 59, 59, 999);
  const timelog = await generate_random_erp_hrm_time_member_timelogs_create(
    memberConnection,
    {
      body: {
        workDate: weekStart.toISOString(),
        durationMinutes: 120,
        projectId: project.id,
        taskId: task.id,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      } satisfies IErpHrmTimeTimelog.ICreate,
    },
  );
  typia.assert(timelog);
  TestValidator.equals(
    "timelog project matches",
    timelog.project.id,
    project.id,
  );
  TestValidator.equals(
    "timelog work date matches week start",
    timelog.workDate,
    weekStart.toISOString(),
  );
  const timesheet = await generate_random_erp_hrm_time_member_timesheets_create(
    memberConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
        weekEndDate: weekEnd.toISOString(),
      } satisfies IErpHrmTimeTimesheet.ICreate,
    },
  );
  typia.assert(timesheet);
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "timesheet week start matches",
    timesheet.weekStartDate,
    weekStart.toISOString(),
  );
  TestValidator.equals(
    "timesheet week end matches",
    timesheet.weekEndDate,
    weekEnd.toISOString(),
  );
  const attachment =
    await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
      memberConnection,
      {
        params: { timesheetId: timesheet.id },
        body: {
          timelogId: timelog.id,
        } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment timesheet matches",
    attachment.timesheet.id,
    timesheet.id,
  );
  TestValidator.equals(
    "attachment timelog matches",
    attachment.timelog.id,
    timelog.id,
  );
  TestValidator.predicate(
    "attachment created timestamp is present",
    () => attachment.createdAt.length > 0,
  );
  TestValidator.predicate(
    "attachment updated timestamp is present",
    () => attachment.updatedAt.length > 0,
  );
  TestValidator.equals(
    "attachment not soft deleted",
    attachment.deletedAt,
    null,
  );
  const duplicateRejected = await TestValidator.error(
    "duplicate timelog attachment should fail",
    async () => {
      await generate_random_erp_hrm_time_member_timesheets_timelogs_create(
        memberConnection,
        {
          params: { timesheetId: timesheet.id },
          body: {
            timelogId: timelog.id,
          } satisfies IErpHrmTimeTimesheetTimelog.ICreate,
        },
      );
    },
  );
  void duplicateRejected;
}
