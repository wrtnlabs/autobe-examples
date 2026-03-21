import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
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
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

export async function test_api_timesheet_timelog_modification_draft(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Setup: Create a project for timelogs
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // Calculate week dates (Monday to Sunday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - daysToMonday);
  weekStartDate.setHours(0, 0, 0, 0);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);
  // Create initial timelogs within the week (3 timelogs)
  const timelogs: IErpHrmTimelog[] = [];
  const durations: number[] = [60, 120, 90]; // 1h, 2h, 1.5h
  for (let i = 0; i < 3; i++) {
    const timelogDate = new Date(weekStartDate);
    timelogDate.setDate(weekStartDate.getDate() + i);
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: timelogDate.toISOString(),
          duration: durations[i],
          billable: true,
        },
      },
    );
    typia.assert(timelog);
    timelogs.push(timelog);
  }
  // Create draft timesheet for the week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify initial timesheet contains all 3 timelogs
  TestValidator.equals("initial timelog count", timesheet.timelogs.length, 3);
  // Verify initial total_hours is sum of durations / 60
  const initialExpectedHours = durations.reduce((sum, d) => sum + d / 60, 0);
  TestValidator.equals(
    "initial total_hours",
    timesheet.total_hours,
    initialExpectedHours,
  );
  // Create additional timelogs within the same week (2 more timelogs)
  const additionalDurations: number[] = [45, 30]; // 0.75h, 0.5h
  const additionalTimelogs: IErpHrmTimelog[] = [];
  for (let i = 0; i < 2; i++) {
    const timelogDate = new Date(weekStartDate);
    timelogDate.setDate(weekStartDate.getDate() + 3 + i);
    const timelog = await generate_random_erp_hrm_member_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: timelogDate.toISOString(),
          duration: additionalDurations[i],
          billable: true,
        },
      },
    );
    typia.assert(timelog);
    additionalTimelogs.push(timelog);
  }
  // Modify timesheet: add 2 new timelogs, remove 1 existing timelog
  const timelogToRemove = timelogs[0].id;
  const timelogsToAdd = additionalTimelogs.map((t) => t.id);
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.updateTimelogs(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          add: timelogsToAdd,
          remove: [timelogToRemove],
        } satisfies IErpHrmTimesheet.IUpdateTimelog,
      },
    );
  typia.assert(updatedTimesheet);
  // Validate: updated timesheet has correct number of timelogs (3 - 1 + 2 = 4)
  TestValidator.equals(
    "updated timelog count",
    updatedTimesheet.timelogs.length,
    4,
  );
  // Validate: removed timelog is no longer in the timesheet
  TestValidator.predicate(
    "removed timelog not in timesheet",
    !updatedTimesheet.timelogs.some((t) => t.id === timelogToRemove),
  );
  // Validate: added timelogs are present
  TestValidator.predicate(
    "all added timelogs present",
    timelogsToAdd.every((id) =>
      updatedTimesheet.timelogs.some((t) => t.id === id),
    ),
  );
  // Validate: total_hours is recalculated correctly
  // Original: 60 + 120 + 90 = 270 min = 4.5h
  // Removed: 60 min = 1h
  // Added: 45 + 30 = 75 min = 1.25h
  // Expected: 120 + 90 + 45 + 30 = 285 min = 4.75h
  const expectedTotalHours = (120 + 90 + 45 + 30) / 60;
  TestValidator.equals(
    "recalculated total_hours",
    updatedTimesheet.total_hours,
    expectedTotalHours,
  );
  // Validate: status remains draft
  TestValidator.equals(
    "status remains draft",
    updatedTimesheet.status,
    "draft",
  );
}
