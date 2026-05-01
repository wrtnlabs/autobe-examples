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
 * Test manager approval of a submitted timesheet in the ERP HRM system.
 *
 * Validates the complete timesheet approval workflow where a manager with
 * time:approve permission approves a timesheet that an employee has
 * submitted for review. The test verifies that the timesheet transitions
 * from submitted to approved status, the reviewer's identity and review
 * timestamp are correctly recorded from the authenticated session, and
 * the response contains the fully updated timesheet with all review
 * metadata populated.
 *
 * 1. Manager registers and authenticates with time:approve permission.
 * 2. Employee registers and authenticates without time:approve permission.
 * 3. Manager creates an active project for time tracking.
 * 4. Manager assigns the employee as a project member.
 * 5. Employee creates a draft timesheet for the current Monday-to-Sunday week.
 * 6. Employee adds a timelog entry to the draft timesheet.
 * 7. Employee submits the timesheet for manager review.
 * 8. Manager approves the submitted timesheet.
 * 9. Validates approval metadata: status, reviewed_at, and reviewedByUser.
 */
export async function test_api_timesheet_approve_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Manager registers and authenticates
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {});
  typia.assert(managerAuth);
  // 2. Employee registers and authenticates
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  typia.assert(employeeAuth);
  // 3. Manager creates an active project
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
        params: { projectId: project.id },
      },
    );
  typia.assert(projectMember);
  // 5. Compute the most recent Monday for the timesheet week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  // 6. Employee creates a draft timesheet
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 7. Employee adds a timelog to the draft timesheet
  const timelog =
    await generate_random_erp_hrm_member_timesheets_timelogs_create(
      employeeConnection,
      {
        params: { timesheetId: timesheet.id },
        body: {
          project_id: project.id,
          date: monday.toISOString().split("T")[0],
        },
      },
    );
  typia.assert(timelog);
  // 8. Employee submits the timesheet for review
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "submitted status",
    submittedTimesheet.status,
    "submitted",
  );
  // 9. Manager approves the submitted timesheet
  const approvedTimesheet =
    await api.functional.erpHrm.member.timesheets.approve(managerConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(approvedTimesheet);
  // 10. Validate approval metadata
  TestValidator.equals(
    "status transitions to approved",
    approvedTimesheet.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at timestamp is recorded",
    approvedTimesheet.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewedByUser is populated with the manager's identity",
    approvedTimesheet.reviewedByUser !== null,
  );
  TestValidator.equals(
    "reviewer matches the authenticated manager",
    approvedTimesheet.reviewedByUser!.email,
    managerAuth.email,
  );
}
