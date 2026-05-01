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
 * Test that an organization Owner with time:manage permission can delete a
 * timelog from a submitted timesheet.
 *
 * Validates the timelog deletion permission override for users holding the
 * time:manage permission. Normally, submitted timesheets lock their timelogs
 * against deletion by the owning employee. However, users with time:manage
 * (the organization Owner in this case) can override this lock and delete
 * timelogs from submitted timesheets.
 *
 * The test verifies the deletion flow end-to-end:
 *
 * 1. Organization Owner (first member, receives Owner role with time:manage)
 *    joins and creates a project.
 * 2. Owner creates a draft timesheet for a fully completed past calendar week
 *    (Monday-Sunday), ensuring the week has already ended so submission is
 *    permitted.
 * 3. Owner creates a timelog within the draft timesheet, referencing the
 *    project and using a date that falls within the week.
 * 4. Owner submits the timesheet, transitioning it from draft to submitted
 *    status.
 * 5. Owner deletes the timelog from the submitted timesheet via the erase
 *    endpoint — this must succeed due to the time:manage permission override.
 * 6. Verification: attempting to delete the same timelog again returns 404,
 *    confirming the timelog was successfully soft-deleted.
 */
export async function test_api_timelog_erase_by_owner_from_submitted_timesheet(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as Owner (first member = organization Owner with time:manage)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 3. Compute a past Monday for a fully completed calendar week
  //    (two Mondays ago ensures the Sunday is also in the past)
  const now = new Date();
  const currentDay = now.getDay();
  const daysToLastMonday = currentDay === 0 ? 6 : currentDay - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToLastMonday - 7);
  monday.setHours(0, 0, 0, 0);
  const weekStartDate = monday.toISOString();
  // 4. Create draft timesheet for the completed past week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    ownerConnection,
    { body: { week_start_date: weekStartDate } },
  );
  typia.assert(timesheet);
  // 5. Create timelog within the timesheet using the Monday as the work date
  const timelogDate = weekStartDate.split("T")[0];
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      ownerConnection,
      {
        body: { project_id: project.id, date: timelogDate },
        params: { timesheetId: timesheet.id },
      },
    );
  typia.assert(timelog);
  // 6. Submit the timesheet for review (draft → submitted)
  const submitted = await api.functional.erpHrm.member.timesheets.submit(
    ownerConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(submitted);
  TestValidator.equals(
    "timesheet status is submitted",
    submitted.status,
    "submitted",
  );
  // 7. Owner erases timelog from submitted timesheet (time:manage override)
  await api.functional.erpHrm.member.timesheets.timelogs.erase(
    ownerConnection,
    {
      timesheetId: timesheet.id,
      timelogId: timelog.id,
    },
  );
  // 8. Verify soft deletion: re-erase should return 404
  await TestValidator.error(
    "re-erase of deleted timelog returns 404",
    async () =>
      await api.functional.erpHrm.member.timesheets.timelogs.erase(
        ownerConnection,
        {
          timesheetId: timesheet.id,
          timelogId: timelog.id,
        },
      ),
  );
}
