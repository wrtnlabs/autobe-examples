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
import { generate_random_erp_hrm_member_employees_create } from "../../../generate/generate_random_erp_hrm_member_employees_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test that users without time:approve permission cannot reject timesheets.
 *
 * Validates the authorization rule ensuring only managers/approvers can reject
 * submitted timesheets, maintaining proper segregation of duties where employees
 * cannot self-approve or self-reject their own timesheets.
 */
export async function test_api_timesheet_rejection_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A (will be organization owner with all permissions)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Create organization (member A becomes owner, system creates Owner/Manager/Employee roles)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberAConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create member B (separate account)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Owner (member A) creates employee record for member B in member A's organization
  // The employee creation requires a roleId - we need to get the Employee role ID
  // Since roles are created automatically (Owner, Manager, Employee), we'll use the utility
  // which handles roleId generation. The member's email is used to lookup/link the member.
  const employeeB = await generate_random_erp_hrm_member_employees_create(
    memberAConnection,
    {
      body: {
        email: memberB.email,
        employmentType: "full_time",
      },
    },
  );
  typia.assert(employeeB);
  // 5. Create project for timelogs
  const project = await generate_random_erp_hrm_member_projects_create(
    memberAConnection,
    {},
  );
  typia.assert(project);
  // 6. Create timelog using member B's connection
  // Note: member B should have an employee record in member A's organization now
  const timelog = await generate_random_erp_hrm_member_timelogs_create(
    memberBConnection,
    {
      body: {
        project_id: project.id,
        date: new Date().toISOString(),
        duration: 480, // 8 hours
      },
    },
  );
  typia.assert(timelog);
  // 7. Create timesheet for the current week
  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    memberBConnection,
    {
      body: {
        week_start_date: monday.toISOString(),
      },
    },
  );
  typia.assert(timesheet);
  // 8. Submit the timesheet to put it in 'submitted' status
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(memberBConnection, {
      timesheetId: timesheet.id,
    });
  typia.assert(submittedTimesheet);
  // Verify timesheet is in submitted status before rejection attempt
  TestValidator.equals(
    "timesheet status before rejection attempt",
    submittedTimesheet.status,
    "submitted",
  );
  // 9. Member B (Employee role, no time:approve permission) attempts to reject the timesheet
  // This should fail with 403 Forbidden since employees cannot reject timesheets
  await TestValidator.httpError(
    "employee without time:approve permission cannot reject timesheet",
    403,
    async () => {
      await api.functional.erpHrm.member.timesheets.reject(memberBConnection, {
        timesheetId: submittedTimesheet.id,
        body: {
          rejection_reason: "This rejection should be denied",
        } satisfies IErpHrmTimesheet.IReject,
      });
    },
  );
}
