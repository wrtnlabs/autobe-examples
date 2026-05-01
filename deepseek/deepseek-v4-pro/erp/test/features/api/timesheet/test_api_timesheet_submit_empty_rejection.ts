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
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that submitting an empty timesheet is rejected with a 422 status code.
 *
 * Validates the server-side rule that a timesheet must contain at least one
 * timelog before it can be submitted for review. An empty draft timesheet
 * should be blocked at submission with a 422 Unprocessable Entity response,
 * and the timesheet should remain in draft status after the rejection.
 *
 * 1. A new member joins and authenticates via the member join utility.
 * 2. The member creates an active project as prerequisite context.
 * 3. A draft timesheet is created for the current calendar week. Since the
 *    member has no prior timelogs, the timesheet is created with zero entries.
 * 4. Verification confirms the timesheet is in draft status and has no timelogs.
 * 5. Submission of the empty timesheet is attempted and the system rejects it
 *    with a 422 status code, proving the empty-timesheet validation is enforced.
 */
export async function test_api_timesheet_submit_empty_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an active project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Compute current week's Monday (noon UTC to avoid timezone ambiguity)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysToMonday,
      12,
      0,
      0,
    ),
  );
  const weekStartDate = monday.toISOString();
  // 4. Create draft timesheet for current week (will be empty — no existing timelogs)
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: weekStartDate,
      },
    },
  );
  typia.assert(timesheet);
  // 5. Verify timesheet is in draft status with no timelogs
  TestValidator.equals("timesheet status is draft", timesheet.status, "draft");
  TestValidator.equals(
    "timesheet has no timelogs",
    timesheet.timelogs.length,
    0,
  );
  // 6. Attempt to submit the empty timesheet — must be rejected with 422
  await TestValidator.httpError(
    "empty timesheet submission rejected with 422",
    422,
    async () => {
      await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
        timesheetId: timesheet.id,
      });
    },
  );
}
