import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { generate_random_erp_hrm_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that submitting a timesheet for a future week is rejected with 422.
 *
 * Validates the business rule that employees cannot submit timesheets for calendar weeks whose Sunday has not yet elapsed. A future week is identified by computing the next upcoming Monday and verifying the server rejects submission with a 422 Unprocessable Entity status. The test also confirms the timesheet remains in draft status after the rejection and the associated timelog is preserved.
 *
 * 1. Employee authenticates by joining as a member via authorize_member_join.
 * 2. Employee creates an active project for timelog association.
 * 3. The next future Monday is computed dynamically.
 * 4. Employee creates a draft timesheet for the future week.
 * 5. Employee adds a timelog to the future-week timesheet.
 * 6. Verifies the timesheet starts in draft status.
 * 7. Employee attempts to submit the future-week timesheet.
 * 8. Verifies the submission is rejected with 422 status.
 */
export async function test_api_timesheet_submit_future_week_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Compute a future Monday (week whose Sunday has not yet elapsed)
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const daysUntilNextMonday = (8 - dayOfWeek) % 7 || 7;
  const nextMonday = new Date(today);
  nextMonday.setUTCDate(today.getUTCDate() + daysUntilNextMonday);
  nextMonday.setUTCHours(0, 0, 0, 0);
  // 4. Create draft timesheet for the future week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: { week_start_date: nextMonday.toISOString() },
    },
  );
  typia.assert(timesheet);
  // 5. Compute a date within the timesheet's week for the timelog (Tuesday)
  const timelogDate = new Date(nextMonday);
  timelogDate.setUTCDate(nextMonday.getUTCDate() + 1);
  const timelogDateStr = timelogDate.toISOString().split("T")[0];
  // 6. Add a timelog to the timesheet
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: timelogDateStr,
        },
        params: { timesheetId: timesheet.id },
      },
    );
  typia.assert(timelog);
  // 7. Verify timesheet is in draft before submission
  TestValidator.equals("timesheet is draft", timesheet.status, "draft");
  // 8. Attempt to submit the future-week timesheet — should be rejected with 422
  await TestValidator.httpError(
    "future week submission rejected",
    422,
    async () => {
      await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
        timesheetId: timesheet.id,
      });
    },
  );
}
