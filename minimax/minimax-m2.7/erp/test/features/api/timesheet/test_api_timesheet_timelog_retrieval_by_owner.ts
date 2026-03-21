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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create project for timelog assignment
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create timelog entry linked to project
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: new Date().toISOString(),
        durationMinutes: 120,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        billable: true,
      },
    },
  );
  typia.assert(timelog);
  // 4. Create draft timesheet for the work week (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const sundayOffset = mondayOffset + 6;
  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() + mondayOffset);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(now);
  weekEndDate.setDate(now.getDate() + sundayOffset);
  weekEndDate.setHours(23, 59, 59, 999);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
        week_end_date: weekEndDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 5. Add the timelog to timesheet creating junction record
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.add(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          erp_hrm_timelog_id: timelog.id,
        },
      },
    );
  typia.assert(updatedTimesheet);
  // Find the junction record id from the updated timesheet's timesheetTimelogs
  const junctionRecord = updatedTimesheet.timesheetTimelogs.find(
    (tt) => tt.erpHrmTimelog.id === timelog.id,
  );
  TestValidator.equals(
    "junction record exists",
    junctionRecord !== undefined,
    true,
  );
  const safeJunctionRecord = typia.assert(junctionRecord!);
  // 6. Retrieve the timesheet-timelog association via GET endpoint
  const association = await api.functional.erpHrm.member.timesheets.timelogs.at(
    memberConnection,
    {
      timesheetId: timesheet.id,
      timesheetTimelogId: safeJunctionRecord.id,
    },
  );
  typia.assert(association);
  // Validate: Response includes junction record id
  TestValidator.equals(
    "junction id matches",
    association.id,
    safeJunctionRecord.id,
  );
  // Validate: addedAt timestamp is present
  TestValidator.predicate(
    "addedAt is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(association.addedAt),
  );
  // Validate: complete timelog details
  TestValidator.equals(
    "timelog date matches",
    association.erpHrmTimelog.date,
    timelog.date,
  );
  TestValidator.equals(
    "timelog duration matches",
    association.erpHrmTimelog.duration_minutes,
    timelog.duration_minutes,
  );
  TestValidator.equals(
    "timelog description matches",
    association.erpHrmTimelog.description,
    timelog.description,
  );
  TestValidator.equals(
    "timelog billable matches",
    association.erpHrmTimelog.billable,
    timelog.billable,
  );
  // Validate: nested erpHrmEmployee is present
  TestValidator.predicate(
    "employee exists",
    association.erpHrmEmployee !== undefined &&
      association.erpHrmEmployee !== null,
  );
  TestValidator.predicate(
    "employee has id",
    association.erpHrmEmployee.id !== undefined,
  );
  TestValidator.predicate(
    "employee has member info",
    association.erpHrmEmployee.member !== undefined,
  );
  // Validate: nested erpHrmProject is present
  TestValidator.predicate(
    "project exists",
    association.erpHrmProject !== undefined &&
      association.erpHrmProject !== null,
  );
  TestValidator.equals(
    "project id matches",
    association.erpHrmProject.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    association.erpHrmProject.name,
    project.name,
  );
  // Validate: erpHrmTask is present (may be null if task assigned)
  TestValidator.predicate("task field exists", "erpHrmTask" in association);
}