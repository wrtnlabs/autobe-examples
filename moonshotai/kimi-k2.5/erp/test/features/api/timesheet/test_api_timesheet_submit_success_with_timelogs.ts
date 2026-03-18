import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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
import { generate_random_erp_hrm_member_organization_members_create } from "../../../generate/generate_random_erp_hrm_member_organization_members_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { generate_random_erp_hrm_member_roles_create } from "../../../generate/generate_random_erp_hrm_member_roles_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { generate_random_erp_hrm_member_timesheets_create } from "../../../generate/generate_random_erp_hrm_member_timesheets_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";
import { prepare_random_erp_hrm_role_permission } from "../../../prepare/prepare_random_erp_hrm_role_permission";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";
import { prepare_random_erp_hrm_timesheet } from "../../../prepare/prepare_random_erp_hrm_timesheet";

/**
 * Test successful timesheet submission with associated timelogs.
 *
 * Scenario:
 * 1. Authenticate as an employee
 * 2. Create organization
 * 3. Create role for employee assignment
 * 4. Create organization member linking user to organization
 * 5. Create project for time tracking
 * 6. Assign employee to project
 * 7. Create draft timesheet for the current week
 * 8. Create timelog entry within the timesheet week
 * 9. Submit timesheet for approval
 * 10. Validate timesheet status changed to 'submitted' and submittedAt is set
 */
export async function test_api_timesheet_submit_success_with_timelogs(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as employee using utility function
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee = await authorize_member_join(employeeConnection, {});
  // Step 2: Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      employeeConnection,
      {},
    );
  // Step 3: Create role for employee assignment
  const role = await generate_random_erp_hrm_member_roles_create(
    employeeConnection,
    {},
  );
  // Step 4: Create organization member linking user to organization
  const orgMember =
    await generate_random_erp_hrm_member_organization_members_create(
      employeeConnection,
      {
        body: {
          organizationId: organization.id,
          userId: employee.id,
          roleId: role.id,
          employmentType: "full_time",
          isActive: true,
        } satisfies IErpHrmOrganizationMember.ICreate,
      },
    );
  // Step 5: Create project for time tracking activities
  const project = await generate_random_erp_hrm_member_projects_create(
    employeeConnection,
    {},
  );
  // Step 6: Assign employee to project to enable timelog creation
  await generate_random_erp_hrm_member_projects_members_create(
    employeeConnection,
    {
      params: { projectId: project.id },
      body: {
        organizationMemberId: orgMember.id,
        role: "member",
      } satisfies IErpHrmProjectMember.ICreate,
    },
  );
  // Step 7: Create draft timesheet for the current week (starting Sunday)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const timesheet = await generate_random_erp_hrm_member_timesheets_create(
    employeeConnection,
    {
      body: {
        weekStartDate: weekStart.toISOString(),
      } satisfies IErpHrmTimesheet.ICreate,
    },
  );
  // Step 8: Create timelog entry for Monday of that week
  const workDate = new Date(weekStart);
  workDate.setDate(weekStart.getDate() + 1);
  const startTime = new Date(workDate);
  startTime.setHours(9, 0, 0, 0);
  const endTime = new Date(workDate);
  endTime.setHours(17, 0, 0, 0);
  await generate_random_erp_hrm_member_timelogs_create(employeeConnection, {
    body: {
      project_id: project.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      billable: true,
      description: "Development work session",
    } satisfies IErpHrmTimelog.ICreate,
  });
  // Step 9: Submit timesheet for approval
  const submittedTimesheet =
    await api.functional.erpHrm.member.timesheets.submit(employeeConnection, {
      timesheetId: timesheet.id,
    });
  // Step 10: Validate response has updated status and timestamp
  typia.assert(submittedTimesheet);
  TestValidator.equals(
    "timesheet status is submitted",
    submittedTimesheet.status,
    "submitted",
  );
  TestValidator.predicate(
    "submittedAt timestamp is recorded",
    submittedTimesheet.submittedAt !== null,
  );
}
