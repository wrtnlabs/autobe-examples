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
 * Test the complete timesheet rejection workflow by a manager with approval permission.
 *
 * Validates the end-to-end rejection flow where an employee creates and submits a timesheet, then a manager reviews and rejects it with a mandatory reason. The test verifies that the timesheet transitions from submitted back to draft status, the rejection reason is persisted, the reviewer's identity and timestamp are recorded, and all timelogs within the timesheet remain intact.
 *
 * This test covers a critical workflow path: employee submits work for review → manager rejects with feedback → employee can revise and resubmit. The rejection mechanism ensures accountability through audit trail metadata (reviewer identity, timestamp, reason) while preserving the employee's time entries for correction.
 *
 * 1. Employee authenticates by joining and creates an active project for time tracking.
 * 2. Employee creates a draft timesheet for a completed calendar week (Monday 2026-04-20 through Sunday 2026-04-26).
 * 3. Employee adds a timelog to the timesheet against the active project on a valid date within the week.
 * 4. Employee submits the timesheet, transitioning it to submitted status and making it available for manager review.
 * 5. A different user (manager) authenticates by joining to act as the reviewer.
 * 6. Manager rejects the submitted timesheet with a descriptive, non-empty rejection reason.
 * 7. Validates the timesheet returns to draft status, the rejection reason matches the input, the reviewer's member identity is recorded, the review timestamp is set, and the timelogs remain unchanged.
 */
export async function test_api_timesheet_rejection_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Employee authentication
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  typia.assert(employee);
  // 2. Create active project
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeConnection,
    {},
  );
  typia.assert(project);
  // 3. Create draft timesheet for completed week (Monday 2026-04-20 to Sunday 2026-04-26)
  const weekStartDate = "2026-04-20T00:00:00.000Z";
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    { body: { week_start_date: weekStartDate } },
  );
  typia.assert(timesheet);
  // 4. Add timelog within the timesheet's week range (Wednesday 2026-04-22)
  const timelogDate = "2026-04-22";
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      employeeConnection,
      {
        body: {
          project_id: project.id,
          date: timelogDate,
          duration_minutes: 480,
        },
        params: { timesheetId: timesheet.id },
      },
    );
  typia.assert(timelog);
  // 5. Submit timesheet for review
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet transitions to submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submitted timestamp is set",
    submittedTimesheet.submitted_at !== null,
  );
  // 6. Manager authentication
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  typia.assert(manager);
  // 7. Manager rejects the timesheet with a clear reason
  const rejectionReason =
    "Timesheet contains incorrect hours for Wednesday. Please review the logged duration and resubmit with accurate time entries.";
  const rejectedTimesheet =
    await api.functional.erpHrm.member.timesheets.reject(managerConnection, {
      timesheetId: submittedTimesheet.id,
      body: {
        rejection_reason: rejectionReason,
      } satisfies IErpHrmTimesheet.IReject,
    });
  typia.assert(rejectedTimesheet);
  // 8. Validate rejection outcome
  TestValidator.equals(
    "status returns to draft for revision",
    rejectedTimesheet.status,
    "draft",
  );
  TestValidator.equals(
    "rejection reason is stored on timesheet",
    rejectedTimesheet.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewer identity is recorded",
    rejectedTimesheet.reviewedByUser !== null,
  );
  if (rejectedTimesheet.reviewedByUser) {
    TestValidator.equals(
      "reviewer matches the manager who rejected",
      rejectedTimesheet.reviewedByUser.id,
      manager.id,
    );
  }
  TestValidator.predicate(
    "review timestamp is set",
    rejectedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "timelogs remain intact after rejection",
    rejectedTimesheet.timelogs.length >= 1 &&
      rejectedTimesheet.timelogs.some((tl) => tl.id === timelog.id),
  );
}
