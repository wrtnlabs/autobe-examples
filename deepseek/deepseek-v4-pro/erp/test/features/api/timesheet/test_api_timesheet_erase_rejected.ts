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
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { generate_random_erp_hrm_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test deletion of a rejected timesheet after the submit-reject workflow.
 *
 * Validates the business rule that a timesheet which has been submitted and then rejected by a manager can be deleted. Unlike submitted or approved timesheets which are blocked from deletion, rejected timesheets — having been returned to the employee for revision — are permitted to be soft-deleted. The test covers the full lifecycle: draft creation, timelog population, submission, manager rejection, and final deletion.
 *
 * 1. An employee registers and creates a draft timesheet for a past week.
 * 2. The employee adds a timelog to the timesheet to satisfy submission requirements.
 * 3. The employee submits the timesheet, transitioning it to submitted status.
 * 4. A manager registers separately, then rejects the submitted timesheet with a reason.
 * 5. The manager deletes the rejected timesheet — the system permits this because the timesheet is no longer in submitted/approved status.
 * 6. Validates that rejection metadata is properly recorded and deletion succeeds without error.
 */
export async function test_api_timesheet_erase_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee registration and authentication
  const employeeConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(employeeConnection, {});
  // 2. Compute a past Monday so the timesheet week has already started (submission requires this)
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const pastMonday = new Date(now);
  pastMonday.setDate(now.getDate() - daysSinceMonday - 7);
  const weekStartDate = pastMonday.toISOString();
  const timelogDate = pastMonday.toISOString().split("T")[0];
  // 3. Create draft timesheet for the past week
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    { body: { week_start_date: weekStartDate } },
  );
  typia.assert(timesheet);
  // 4. Add a timelog to the timesheet so it can be submitted
  await generate_random_erp_hrm_member_timesheets_timelogs_create(
    employeeConnection,
    {
      body: { date: timelogDate },
      params: { timesheetId: timesheet.id },
    },
  );
  // 5. Submit the timesheet for review
  const submitted = await api.functional.erpHrm.member.timesheets.submit(
    employeeConnection,
    { timesheetId: timesheet.id },
  );
  typia.assert(submitted);
  // 6. Manager registration and authentication
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // 7. Manager rejects the submitted timesheet
  const rejected = await api.functional.erpHrm.member.timesheets.reject(
    managerConnection,
    {
      timesheetId: timesheet.id,
      body: {
        rejection_reason: "Hours need correction before resubmission",
      } satisfies IErpHrmTimesheet.IReject,
    },
  );
  typia.assert(rejected);
  // 8. Validate rejection metadata is properly recorded
  TestValidator.equals(
    "rejection reason is preserved",
    rejected.rejection_reason,
    "Hours need correction before resubmission",
  );
  TestValidator.predicate(
    "review timestamp is set",
    rejected.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer is identified",
    rejected.reviewedByUser !== null,
  );
  // 9. Manager deletes the rejected timesheet — core assertion: deletion must succeed
  await api.functional.erpHrm.member.timesheets.erase(managerConnection, {
    timesheetId: timesheet.id,
  });
}
