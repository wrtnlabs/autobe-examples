import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmBudgetAnalysis } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmBudgetAnalysis";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
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
import { generate_random_erp_hrm_admin_employees_create } from "../../../generate/generate_random_erp_hrm_admin_employees_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

/**
 * Test that projects without budget hours configured are excluded from the budget report.
 *
 * 1. Authenticate as admin
 * 2. Create organization
 * 3. Create employee with Owner role
 * 4. Create Project X with 50 budget hours
 * 5. Create Project Y without budget hours (null)
 * 6. Assign employee to both projects
 * 7. Log 25 hours to Project X
 * 8. Log 8 hours to Project Y
 * 9. Call budget analytics endpoint
 * 10. Verify Project X is in results with 50% utilization
 * 11. Verify Project Y is NOT in results
 */
export async function test_api_project_budget_report_excludes_projects_without_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  // 3. Set organization context for admin
  await generate_random_erp_hrm_member_organization_context_select(
    adminConnection,
    {
      body: {
        organizationId: organization.id,
      },
    },
  );
  // 4. Get Owner role ID from admin's employee context
  const adminOrgContext =
    await api.functional.erpHrm.member.organization_context.select(
      adminConnection,
      {
        body: {
          organizationId: organization.id,
        },
      },
    );
  const ownerRoleId = adminOrgContext.employee.role.id;
  // 5. Create a member (employee) for timelogging
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
    },
  });
  // 6. Create employee in organization using existing member's email
  await generate_random_erp_hrm_admin_employees_create(adminConnection, {
    body: {
      email: memberEmail,
      roleId: ownerRoleId,
      employmentType: "full-time",
    },
  });
  // 7. Get the employee's ID by looking up via organization context
  const memberOrgContext =
    await generate_random_erp_hrm_member_organization_context_select(
      memberConnection,
      {
        body: {
          organizationId: organization.id,
        },
      },
    );
  const employeeId = memberOrgContext.employee.id;
  // 8. Create Project X with budget hours (50 hours)
  const projectX = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Project With Budget",
        color: "#FF5733",
        status: "active",
        budgetHours: 50,
      },
    },
  );
  // 9. Create Project Y without budget hours (null)
  const projectY = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: "Project Without Budget",
        color: "#4A90E2",
        status: "active",
        budgetHours: null,
      },
    },
  );
  // Store project IDs for comparison
  const projectXId = (projectX as any).id;
  const projectYId = (projectY as any).id;
  const projectXName = (projectX as any).name;
  const projectYName = (projectY as any).name;
  // 10. Assign employee to Project X
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: {
      projectId: projectXId,
    },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  // 11. Assign employee to Project Y
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: {
      projectId: projectYId,
    },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  // 12. Log timelogs to Project X (25 hours = 1500 minutes)
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: {
      projectId: projectXId,
      date: new Date().toISOString(),
      durationMinutes: 1500, // 25 hours
      description: "Work on Project X",
      billable: true,
    },
  });
  // 13. Also log some time to Project Y to verify it exists but is excluded
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: {
      projectId: projectYId,
      date: new Date().toISOString(),
      durationMinutes: 480, // 8 hours
      description: "Work on Project Y",
      billable: true,
    },
  });
  // 14. Call budget analytics endpoint
  const budgetReport =
    await api.functional.erpHrm.admin.analytics.budget.search(adminConnection, {
      body: {} satisfies IErpHrmBudgetAnalysis.IRequest,
    });
  typia.assert(budgetReport);
  // 15. Verify Project X is in the results with correct utilization
  // The budget report contains items array with budget analysis per project
  const reportItems = (budgetReport as any).items;
  const projectXResult = reportItems?.find(
    (item: any) => item.projectId === projectXId,
  );
  TestValidator.predicate(
    "Project X with budget hours should be in results",
    projectXResult !== undefined,
  );
  TestValidator.equals(
    "Project X name matches",
    projectXResult!.projectName,
    projectXName,
  );
  TestValidator.equals(
    "Project X budget hours is 50",
    projectXResult!.budgetHours,
    50,
  );
  TestValidator.equals(
    "Project X actual hours is 25",
    projectXResult!.actualHoursLogged,
    25,
  );
  TestValidator.equals(
    "Project X utilization is 50%",
    projectXResult!.budgetUtilizationPercentage,
    50,
  );
  // 16. Verify Project Y (without budget hours) is NOT in the results
  const projectYResult = reportItems?.find(
    (item: any) => item.projectId === projectYId,
  );
  TestValidator.equals(
    "Project Y without budget hours should NOT be in results",
    projectYResult,
    null,
  );
}
