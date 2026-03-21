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

/**
 * Test the complete workflow of adding timelogs to a draft timesheet.
 *
 * This test validates that:
 * 1. Timelogs can be added to a draft timesheet after initial creation
 * 2. Total hours are recalculated correctly after adding timelogs
 * 3. Timesheet status remains 'draft' after adding timelogs
 * 4. Duplicate timelog additions are rejected with an error
 */
export async function test_api_timesheet_timelog_addition_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a project for time logging
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color_code: "#FF5733",
      },
    },
  );
  typia.assert(project);
  // 3. Calculate a valid week (Monday to Sunday)
  const now = new Date();
  const currentDay = now.getDay();
  const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  // 4. Create initial timelog entries within the week
  const timelog1Date = new Date(weekStart);
  timelog1Date.setDate(weekStart.getDate() + 1);
  const timelog2Date = new Date(weekStart);
  timelog2Date.setDate(weekStart.getDate() + 3);
  const duration1 = 120; // 2 hours in minutes
  const duration2 = 90; // 1.5 hours in minutes
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: timelog1Date.toISOString(),
        duration: duration1,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: timelog2Date.toISOString(),
        duration: duration2,
      },
    },
  );
  typia.assert(timelog2);
  // 5. Create a draft timesheet for the week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStart.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify initial timesheet state
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  // Verify initial timelogs are included (auto-included during timesheet creation)
  const initialTimelogIds = timesheet.timelogs.map((t) => t.id);
  TestValidator.predicate(
    "timelog1 auto-included in timesheet",
    initialTimelogIds.includes(timelog1.id),
  );
  TestValidator.predicate(
    "timelog2 auto-included in timesheet",
    initialTimelogIds.includes(timelog2.id),
  );
  // 6. Create additional timelog within the same week (but after timesheet creation)
  const timelog3Date = new Date(weekStart);
  timelog3Date.setDate(weekStart.getDate() + 5);
  const duration3 = 60; // 1 hour in minutes
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: timelog3Date.toISOString(),
        duration: duration3,
      },
    },
  );
  typia.assert(timelog3);
  // 7. Add the additional timelog to the draft timesheet
  const updatedTimesheet =
    await api.functional.erpHrm.member.timesheets.timelogs.addTimelogs(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          timelogIds: [timelog3.id],
        },
      },
    );
  typia.assert(updatedTimesheet);
  // 8. Verify the response includes all timelogs
  const allTimelogIds = updatedTimesheet.timelogs.map((t) => t.id);
  TestValidator.predicate(
    "all timelogs present after addition",
    allTimelogIds.includes(timelog1.id) &&
      allTimelogIds.includes(timelog2.id) &&
      allTimelogIds.includes(timelog3.id),
  );
  // 9. Verify total_hours is recalculated correctly
  const expectedTotalHours = (duration1 + duration2 + duration3) / 60;
  TestValidator.equals(
    "total hours recalculated",
    updatedTimesheet.total_hours,
    expectedTotalHours,
  );
  // 10. Verify the timesheet status remains 'draft'
  TestValidator.equals(
    "status remains draft after timelog addition",
    updatedTimesheet.status,
    "draft",
  );
  // 11. Verify duplicate timelog addition fails
  await TestValidator.error("duplicate timelog addition fails", async () => {
    await api.functional.erpHrm.member.timesheets.timelogs.addTimelogs(
      memberConnection,
      {
        timesheetId: timesheet.id,
        body: {
          timelogIds: [timelog3.id],
        },
      },
    );
  });
}
