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

export async function test_api_timesheet_update_rejected_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member (employee)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a project for timelog entries
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(project);
  // 3. Create timelog entries for a work week
  const weekStartDate = new Date();
  weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1); // Monday
  weekStartDate.setHours(0, 0, 0, 0);
  const timelog1 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: weekStartDate.toISOString(),
        duration: 480, // 8 hours
        description: "Original work entry",
        billable: true,
      },
    },
  );
  typia.assert(timelog1);
  const timelog2 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date(weekStartDate.getTime() + 86400000).toISOString(), // Tuesday
        duration: 360, // 6 hours
        description: "Revised work entry",
        billable: true,
      },
    },
  );
  typia.assert(timelog2);
  const timelog3 = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        project_id: project.id,
        date: new Date(weekStartDate.getTime() + 2 * 86400000).toISOString(), // Wednesday
        duration: 420, // 7 hours
        description: "Additional revision entry",
        billable: true,
      },
    },
  );
  typia.assert(timelog3);
  // 4. Create a draft timesheet for the work week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // Verify initial timesheet state
  TestValidator.equals("initial status is draft", timesheet.status, "draft");
  TestValidator.predicate(
    "has timelogs initially",
    timesheet.timelogs.length > 0,
  );
  // 5. Update the timesheet with revised timelog IDs
  // Note: This simulates the revision process after a rejection.
  // When a timesheet is rejected, it returns to 'draft' status for revision.
  // The employee can then update the timelog associations and resubmit.
  const revisedTimelogIds = [timelog1.id, timelog2.id, timelog3.id];
  const updatedTimesheet = await api.functional.erpHrm.member.timesheets.update(
    memberConnection,
    {
      timesheetId: timesheet.id,
      body: {
        timelog_ids: revisedTimelogIds,
      } satisfies IErpHrmTimesheet.IUpdate,
    },
  );
  typia.assert(updatedTimesheet);
  // 6. Validate the updated timesheet
  TestValidator.equals(
    "status remains draft",
    updatedTimesheet.status,
    "draft",
  );
  // Calculate expected total hours: (480 + 360 + 420) / 60 = 21 hours
  const expectedTotalHours = (480 + 360 + 420) / 60;
  TestValidator.equals(
    "total_hours recalculated correctly",
    updatedTimesheet.total_hours,
    expectedTotalHours,
  );
  // Verify timelog IDs are correctly associated
  const updatedTimelogIds = updatedTimesheet.timelogs.map((t) => t.id);
  TestValidator.equals(
    "timelogs count matches",
    updatedTimesheet.timelogs.length,
    3,
  );
  TestValidator.predicate(
    "all timelogs are correctly associated",
    revisedTimelogIds.every((id) => updatedTimelogIds.includes(id)),
  );
  // Verify rejection_reason is null for draft timesheet
  TestValidator.equals(
    "rejection_reason is null",
    updatedTimesheet.rejection_reason,
    null,
  );
}
