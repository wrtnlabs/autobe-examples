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

/**
 * Test that a timelog already associated with a submitted or approved timesheet
 * cannot be added to another timesheet.
 *
 * **Setup:**
 * 1. Authenticate as member via POST /erpHrm/auth/member/join
 * 2. Create a project via POST /erpHrm/member/projects
 * 3. Create timelog A via POST /erpHrm/member/timelogs with a date
 * 4. Create first draft timesheet via POST /erpHrm/member/timesheets covering the timelog date
 * 5. Submit the first timesheet via POST /erpHrm/member/timesheets/{timesheetId}/submit
 * 6. Create a second draft timesheet via POST /erpHrm/member/timesheets covering the same week
 *
 * **Test Execution:**
 * - Send POST request to /erpHrm/member/timesheets/{secondTimesheetId}/timelogs
 *   with body: { "erp_hrm_timelog_id": "<timelogA_uuid>" }
 *
 * **Validation Points:**
 * - Response status should indicate error (expected: 400 or 409)
 * - Response should include error message explaining that the timelog is already
 *   associated with another submitted or approved timesheet
 * - The second timesheet should remain unchanged
 */
export async function test_api_timesheet_timelog_already_in_another_submitted_timesheet(
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
  // 3. Create timelog A with a specific date (use a recent date for the timesheet week)
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
  currentWeekStart.setHours(10, 0, 0, 0);
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: currentWeekStart.toISOString(),
        durationMinutes: 60,
        description: "Timelog for testing locked timelog scenario",
      },
    },
  );
  typia.assert(timelog);
  // 4. Create first draft timesheet covering the timelog date
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6); // Sunday
  const firstTimesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: currentWeekStart.toISOString(),
        week_end_date: weekEnd.toISOString(),
      },
    },
  );
  typia.assert(firstTimesheet);
  // 5. Submit the first timesheet
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: firstTimesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Verify the timesheet is submitted
  TestValidator.equals(
    "first timesheet status should be submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // 6. Create a second draft timesheet covering the same week
  const secondTimesheet =
    await generate_random_erp_hrm_member_timesheets_create(memberConnection, {
      body: {
        week_start_date: currentWeekStart.toISOString(),
        week_end_date: weekEnd.toISOString(),
      },
    });
  typia.assert(secondTimesheet);
  // Verify the second timesheet is in draft status
  TestValidator.equals(
    "second timesheet status should be draft",
    secondTimesheet.status,
    "draft",
  );
  // **Test Execution:**
  // Try to add the already-submitted timelog to the second timesheet
  // This should fail because the timelog is already in a submitted timesheet
  await TestValidator.error(
    "adding timelog already in submitted timesheet should fail",
    async () => {
      await api.functional.erpHrm.member.timesheets.timelogs.add(
        memberConnection,
        {
          timesheetId: secondTimesheet.id,
          body: {
            erp_hrm_timelog_id: timelog.id,
          } satisfies IErpHrmTimesheetTimelog.IAddRequest,
        },
      );
    },
  );
}
