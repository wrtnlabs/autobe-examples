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
 * Test that an employee can delete their own timelog from a draft timesheet.
 *
 * Validates the primary success path for timelog deletion: an employee who owns both the timelog and its enclosing timesheet can soft-delete the timelog as long as the timesheet remains in draft status. The test follows the natural workflow of project creation, timesheet drafting, timelog logging, and deletion.
 *
 * After deletion, the timelog should be soft-deleted (deleted_at set, timesheet_id cleared to null), rendering it inaccessible via subsequent operations. The activity log should record a timelog.deleted action.
 *
 * 1. Employee registers and authenticates via authorize_member_join.
 * 2. Employee creates an active project for time tracking.
 * 3. Employee creates a draft timesheet for the most recent Monday.
 * 4. Employee creates a timelog within the draft timesheet against the project.
 * 5. Employee deletes the timelog via the erase endpoint.
 * 6. Verifies deletion by attempting to re-delete — should fail with error indicating the timelog no longer exists.
 */
export async function test_api_timelog_erase_from_draft_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as employee
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Compute the most recent Monday for timesheet week_start_date
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  // 4. Create draft timesheet for the current week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 5. Create a timelog within the draft timesheet
  const timelogDate = monday.toISOString().split("T")[0];
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      memberConnection,
      {
        params: { timesheetId: timesheet.id },
        body: {
          project_id: project.id,
          date: timelogDate satisfies string & tags.Format<"date">,
        },
      },
    );
  typia.assert(timelog);
  // 6. Delete the timelog from the draft timesheet
  await api.functional.erpHrm.member.timesheets.timelogs.erase(
    memberConnection,
    {
      timesheetId: timesheet.id,
      timelogId: timelog.id,
    },
  );
  // 7. Verify deletion — re-deletion should fail
  await TestValidator.error(
    "re-deletion of deleted timelog should fail",
    async () => {
      await api.functional.erpHrm.member.timesheets.timelogs.erase(
        memberConnection,
        {
          timesheetId: timesheet.id,
          timelogId: timelog.id,
        },
      );
    },
  );
}
