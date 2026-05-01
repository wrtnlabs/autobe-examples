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
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { generate_random_erp_hrm_member_timesheets_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_timelogs_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that approving an already-approved timesheet returns 409 Conflict.
 *
 * Validates terminal state enforcement in the timesheet approval workflow. Once a timesheet reaches the approved status — a terminal state — no further status transitions are permitted. Attempting to approve an already-approved timesheet must be rejected with a 409 Conflict response.
 *
 * The test sets up the full workflow: manager and employee registration, project creation with member assignment, draft timesheet creation with a timelog, employee submission, and then a first successful approval by the manager. The second approval attempt on the now-approved timesheet is expected to fail with 409, confirming that the approved terminal state is properly enforced and no duplicate approvals can occur.
 *
 * 1. Manager registers and authenticates via authorize_member_join.
 * 2. Employee registers and authenticates via authorize_member_join.
 * 3. Manager creates an active project.
 * 4. Manager assigns the employee as a project member.
 * 5. Employee creates a draft timesheet for a calendar week.
 * 6. Employee adds a timelog to the draft timesheet.
 * 7. Employee submits the timesheet (draft → submitted).
 * 8. Manager approves the timesheet (submitted → approved) — first approval succeeds.
 * 9. Manager attempts second approval on the approved timesheet — expect 409 Conflict.
 */
export async function test_api_timesheet_approve_already_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager setup — register and authenticate as manager (Owner role includes time:approve)
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  // 2. Employee setup — register and authenticate as employee who will own the timesheet
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  // 3. Manager creates an active project for time tracking
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // 4. Manager assigns the employee as a project member
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: { erp_hrm_employee_id: employee.id },
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 5. Employee creates a draft timesheet for a calendar week
  const draftTimesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {},
  );
  typia.assert(draftTimesheet);
  // 6. Employee adds a timelog to the draft timesheet so it can be submitted
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      employeeConnection,
      {
        body: { project_id: project.id },
        params: { timesheetId: draftTimesheet.id },
      },
    );
  typia.assert(timelog);
  // 7. Employee submits the timesheet (draft → submitted)
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: draftTimesheet.id,
    });
  typia.assert(submittedTimesheet);
  // 8. Manager approves the timesheet (submitted → approved) — first approval succeeds
  const approvedTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(managerConnection, {
      timesheetId: draftTimesheet.id,
    });
  typia.assert(approvedTimesheet);
  TestValidator.equals(
    "timesheet status after first approval",
    approvedTimesheet.status,
    "approved",
  );
  // 9. Manager attempts second approval on already-approved timesheet — expect 409 Conflict
  await TestValidator.httpError(
    "second approval on approved timesheet returns 409 Conflict",
    409,
    async () => {
      await api.functional.erpHrm.member.timesheets.approve(managerConnection, {
        timesheetId: draftTimesheet.id,
      });
    },
  );
}
