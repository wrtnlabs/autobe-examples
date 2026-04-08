import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationDashboard";
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
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { generate_random_erp_hrm_admin_projects_members_create } from "../../../generate/generate_random_erp_hrm_admin_projects_members_create";
import { generate_random_erp_hrm_member_timelogs_create } from "../../../generate/generate_random_erp_hrm_member_timelogs_create";
import { prepare_random_erp_hrm_employee } from "../../../prepare/prepare_random_erp_hrm_employee";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_timelog } from "../../../prepare/prepare_random_erp_hrm_timelog";

export async function test_api_organization_dashboard_budget_alerts_threshold(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create member - store password for login
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Login with member credentials
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create employee via admin (using the member's email)
  const employeeResult = await generate_random_erp_hrm_admin_employees_create(
    adminConnection,
    {
      body: {
        email: memberEmail,
        roleId:
          member.token.access.length > 0
            ? typia.random<string & tags.Format<"uuid">>()
            : typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
      },
    },
  );
  // Extract employee ID from the invitation/employee response
  const employeeId =
    (employeeResult as any).id ??
    (employeeResult as any).employee?.id ??
    typia.random<string & tags.Format<"uuid">>();
  // 4. Create projects with different budget configurations
  // Project with 10 budget hours - will reach 90% with 9 hours logged
  const projectOverBudgetRaw = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: "#FF5733",
        status: "active",
        budgetHours: 10,
      },
    },
  );
  const projectOverBudget = typia.assert<IErpHrmProject & { id: string }>(projectOverBudgetRaw);
  // Project without budget hours - should not appear in alerts
  const projectNoBudgetRaw = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        color: "#4A90E2",
        status: "active",
        budgetHours: null,
      },
    },
  );
  const projectNoBudget = typia.assert<IErpHrmProject & { id: string }>(projectNoBudgetRaw);
  // Project with 100 budget hours - 9 hours = 9% utilization (below threshold)
  const projectUnderUtilizationRaw =
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.name(2),
        color: "#50C878",
        status: "active",
        budgetHours: 100,
      },
    });
  const projectUnderUtilization = typia.assert<IErpHrmProject & { id: string }>(projectUnderUtilizationRaw);
  // 5. Assign employee to all projects
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: { projectId: projectOverBudget.id },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: { projectId: projectNoBudget.id },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  await generate_random_erp_hrm_admin_projects_members_create(adminConnection, {
    params: { projectId: projectUnderUtilization.id },
    body: {
      employeeId: employeeId,
      assignedRole: "member",
    },
  });
  // 6. Create timelogs
  // 9 hours = 540 minutes for over-budget project (90% utilization - triggers alert)
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: {
      projectId: projectOverBudget.id,
      date: new Date().toISOString(),
      durationMinutes: 540, // 9 hours
      billable: true,
    },
  });
  // 9 hours = 540 minutes for under-utilization project (9% utilization - below threshold)
  await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
    body: {
      projectId: projectUnderUtilization.id,
      date: new Date().toISOString(),
      durationMinutes: 540, // 9 hours
      billable: true,
    },
  });
  // 7. Retrieve organization dashboard
  const dashboard =
    await api.functional.erpHrm.admin.dashboard.organization.at(
      adminConnection,
    );
  typia.assert(dashboard);
  // 8. Validations
  // Project with 90% utilization (>80% threshold) MUST appear in budgetAlertProjects
  const overBudgetAlert = dashboard.budgetAlertProjects.find(
    (p) => p.id === projectOverBudget.id,
  );
  TestValidator.predicate(
    "project with 90% budget utilization appears in budgetAlertProjects",
    overBudgetAlert !== undefined,
  );
  // Project without budget hours MUST NOT appear in budgetAlertProjects
  const noBudgetAlert = dashboard.budgetAlertProjects.find(
    (p) => p.id === projectNoBudget.id,
  );
  TestValidator.predicate(
    "project without budget hours does NOT appear in budgetAlertProjects",
    noBudgetAlert === undefined,
  );
  // Project with 9% utilization (<80% threshold) MUST NOT appear in budgetAlertProjects
  const underUtilizationAlert = dashboard.budgetAlertProjects.find(
    (p) => p.id === projectUnderUtilization.id,
  );
  TestValidator.predicate(
    "project with 9% utilization does NOT appear in budgetAlertProjects",
    underUtilizationAlert === undefined,
  );
  // Verify all projects in budgetAlertProjects are active
  for (const project of dashboard.budgetAlertProjects) {
    TestValidator.equals(
      "only active projects appear in budgetAlertProjects",
      project.status,
      "active",
    );
  }
}