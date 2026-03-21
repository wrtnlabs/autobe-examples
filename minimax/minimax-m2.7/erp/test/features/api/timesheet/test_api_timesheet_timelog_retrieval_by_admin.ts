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

export async function test_api_timesheet_timelog_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 4. Create a task within the project (optional for timelog)
  const task = await generate_random_erp_hrm_member_projects_tasks_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        priority: "medium",
      },
    },
  );
  typia.assert(task);
  // 5. Create a weekly timesheet first to get week dates
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
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
  // 6. Create a timelog with date within timesheet week
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: weekStart.toISOString(),
        durationMinutes: 60,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 7. Add timelog to timesheet
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          erp_hrm_timelog_id: timelog.id,
        } satisfies IErpHrmTimesheetTimelog.IAddRequest,
      },
    );
  typia.assert(updatedTimesheet);
  // Get the timesheetTimelogId from the junction record
  TestValidator.predicate(
    "timesheet has timelogs",
    updatedTimesheet.timesheetTimelogs.length > 0,
  );
  const timesheetTimelogId = updatedTimesheet.timesheetTimelogs[0].id;
  // 8. Admin retrieves the timesheet-timelog association
  const timesheetTimelog =
    await api.functional.erpHrm.admin.timesheets.timelogs.at(adminConnection, {
      timesheetId: timesheet.id,
      timesheetTimelogId: timesheetTimelogId,
    });
  typia.assert(timesheetTimelog);
  // 9. Validate response structure (IErpHrmTimesheetTimelog.IInvert)
  TestValidator.equals(
    "junction record id matches",
    timesheetTimelog.id,
    timesheetTimelogId,
  );
  TestValidator.predicate(
    "addedAt timestamp exists",
    !!timesheetTimelog.addedAt,
  );
  TestValidator.predicate(
    "timelog details exist",
    !!timesheetTimelog.erpHrmTimelog,
  );
  TestValidator.equals(
    "timelog date matches",
    timesheetTimelog.erpHrmTimelog.date,
    timelog.date,
  );
  TestValidator.equals(
    "duration_minutes matches",
    timesheetTimelog.erpHrmTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "description matches",
    timesheetTimelog.erpHrmTimelog.description,
    timelog.description,
  );
  TestValidator.equals(
    "billable flag matches",
    timesheetTimelog.erpHrmTimelog.billable,
    timelog.billable,
  );
  TestValidator.predicate(
    "embedded project info exists",
    !!timesheetTimelog.erpHrmProject,
  );
  TestValidator.equals(
    "project id matches",
    timesheetTimelog.erpHrmProject.id,
    project.id,
  );
  TestValidator.predicate(
    "embedded employee info exists",
    !!timesheetTimelog.erpHrmEmployee,
  );
  TestValidator.predicate(
    "timesheet context exists",
    !!timesheetTimelog.erpHrmTimesheet,
  );
  TestValidator.equals(
    "timesheet id matches",
    timesheetTimelog.erpHrmTimesheet.id,
    timesheet.id,
  );
}
