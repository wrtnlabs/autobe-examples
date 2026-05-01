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
 * Test that a submitted timesheet rejects week range updates with 409 Conflict.
 *
 * Validates the immutability of submitted timesheets by verifying that the week range cannot be modified once a timesheet transitions from draft to submitted status. The test covers the full lifecycle: member authentication, project creation, draft timesheet creation for a past calendar week, timelog addition to satisfy the non-empty requirement, submission for approval, and the rejected update attempt.
 *
 * The core assertion is that updating the week_start_date on a submitted timesheet returns a 409 Conflict, confirming that only draft timesheets are mutable. No verification of the timesheet's unchanged state is performed after the rejection since no GET endpoint is available in the SDK.
 *
 * 1. Member joins and authenticates via authorize_member_join.
 * 2. Project is created to serve as the timelog's parent entity.
 * 3. A draft timesheet is created for the most recent Monday week.
 * 4. A timelog is added to the draft timesheet to satisfy submission requirements.
 * 5. The timesheet is submitted, transitioning from draft to submitted status.
 * 6. Attempt to update the timesheet's week_start_date is rejected with 409 Conflict.
 */
export async function test_api_timesheet_update_rejected_when_submitted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create project for timelog reference
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Compute the most recent Monday for the timesheet week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const recentMonday = new Date(now);
  recentMonday.setDate(now.getDate() - daysSinceMonday);
  const weekStartDate =
    recentMonday.toISOString().split("T")[0] + "T00:00:00.000Z";
  // 4. Create draft timesheet for the past Monday week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate as string & tags.Format<"date-time">,
      },
    },
  );
  typia.assert(timesheet);
  // 5. Add a timelog to the draft timesheet (required for submission)
  const timelogDate = recentMonday.toISOString().split("T")[0] as string &
    tags.Format<"date">;
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      memberConnection,
      {
        body: {
          project_id: project.id,
          date: timelogDate,
        },
        params: { timesheetId: timesheet.id },
      },
    );
  typia.assert(timelog);
  // 6. Submit the timesheet, transitioning from draft to submitted
  const submitted = await api.functional.erpHrm.member.timesheets.submit(
    memberConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(submitted);
  // 7. Attempt to update the submitted timesheet — expect 409 Conflict
  const nextMonday = new Date(recentMonday);
  nextMonday.setDate(recentMonday.getDate() + 7);
  const newWeekStartDate =
    nextMonday.toISOString().split("T")[0] + "T00:00:00.000Z";
  await TestValidator.httpError(
    "submitted timesheet cannot be updated",
    409,
    async () => {
      await api.functional.erpHrm.member.timesheets.update(memberConnection, {
        timesheetId: timesheet.id,
        body: {
          week_start_date: newWeekStartDate as string &
            tags.Format<"date-time">,
        },
      });
    },
  );
}
