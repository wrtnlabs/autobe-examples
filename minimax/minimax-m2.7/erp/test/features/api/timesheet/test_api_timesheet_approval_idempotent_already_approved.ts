import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_tasks_create } from "../../../generate/generate_random_erp_hrm_member_projects_tasks_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_task } from "../../../prepare/prepare_random_erp_hrm_task";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test idempotent behavior when approving an already-approved timesheet.
 *
 * Setup: Use dependencies to complete the full workflow up to and including
 * the first approval call, which transitions the timesheet to approved status.
 *
 * Step 1: Verify the timesheet is in 'approved' status with reviewer information
 *         (reviewerEmployee, reviewed_at) recorded from the first approval.
 *
 * Step 2: Call POST /erpHrm/admin/timesheets/{timesheetId}/approve again on the
 *         same already-approved timesheet.
 *
 * Step 3: Verify the response returns success without error, confirming idempotent
 *         behavior.
 *
 * Step 4: Verify the original reviewer_employee_id and reviewed_at timestamp
 *         remain unchanged - not overwritten by the second approval call.
 *
 * Step 5: Verify the timesheet status remains 'approved' (not reverted or duplicated).
 */
export async function test_api_timesheet_approval_idempotent_already_approved(
  connection: api.IConnection,
): Promise<void> {
  // ===== SETUP: Create admin and member =====
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ===== Create project and timelog =====
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const startDate = weekStart.toISOString();
  const endDate = new Date(
    weekStart.getTime() + 6 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // ===== Create timesheet =====
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberConnection,
    {
      body: {
        week_start_date: startDate,
        week_end_date: endDate,
      },
    },
  );
  typia.assert(timesheet);
  // ===== Create and add timelog to timesheet =====
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberConnection,
    {
      body: {
        projectId: project.id,
        date: startDate,
        durationMinutes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      },
    },
  );
  typia.assert(timelog);
  await api.functional.erpHrm.member.timesheets.timelogs.add(memberConnection, {
    timesheetId: timesheet.id,
    body: { erp_hrm_timelog_id: timelog.id },
  });
  // ===== Submit timesheet =====
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  // ===== STEP 1: First approval - verify timesheet is approved with reviewer info =====
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const approvedTimesheet =
    await api.functional.erpHrm.admin.timesheets.approve(adminConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "status is approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.notEquals(
    "reviewer exists",
    approvedTimesheet.reviewerEmployee,
    null,
  );
  TestValidator.notEquals(
    "reviewed_at exists",
    approvedTimesheet.reviewed_at,
    null,
  );
  const originalReviewerId = approvedTimesheet.reviewerEmployee!.id;
  const originalReviewedAt = approvedTimesheet.reviewed_at!;
  // ===== STEP 2-5: Second approval - idempotent behavior verification =====
  const secondApproval = await api.functional.erpHrm.admin.timesheets.approve(
    adminConnection,
    {
      timesheetId: timesheet.id,
    },
  );
  typia.assert(secondApproval);
  TestValidator.equals(
    "status still approved",
    secondApproval.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer unchanged",
    secondApproval.reviewerEmployee!.id,
    originalReviewerId,
  );
  TestValidator.equals(
    "reviewed_at unchanged",
    secondApproval.reviewed_at,
    originalReviewedAt,
  );
}
