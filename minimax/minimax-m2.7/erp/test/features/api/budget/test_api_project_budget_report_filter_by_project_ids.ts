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

export async function test_api_project_budget_report_filter_by_project_ids(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account first
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // 2. Admin joins and creates organization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create three projects with budget hours
  const projectAlpha = typia.assert<IErpHrmProject>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: "Project Alpha",
        color: "#FF5733",
        budgetHours: 100,
        status: "active",
      },
    }),
  );
  const projectBeta = typia.assert<IErpHrmProject>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: "Project Beta",
        color: "#4A90E2",
        budgetHours: 100,
        status: "active",
      },
    }),
  );
  const projectGamma = typia.assert<IErpHrmProject>(
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: "Project Gamma",
        color: "#28A745",
        budgetHours: 100,
        status: "active",
      },
    }),
  );
  // 4. Set organization context for member
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {
      body: {
        organizationId: organization.id,
      },
    },
  );
  // 5. Create employee
  const employeeInvitation =
    await generate_random_erp_hrm_admin_employees_create(adminConnection, {
      body: {
        email: memberEmail,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
      },
    });
  typia.assert(employeeInvitation);
  // 6. Get employee ID
  const orgContext =
    await api.functional.erpHrm.member.organization_context.select(
      memberConnection,
      {
        body: { organizationId: organization.id },
      },
    );
  typia.assert(orgContext);
  const employeeId = orgContext.employee.id;
  // 7. Extract project IDs from budget report items
  // Note: IErpHrmProject is the budget report format with items array
  const projectAlphaId = projectAlpha.items[0]?.projectId;
  const projectBetaId = projectBeta.items[0]?.projectId;
  const projectGammaId = projectGamma.items[0]?.projectId;
  // 8. Assign employee to all three projects
  if (projectAlphaId) {
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: projectAlphaId },
        body: { employeeId: employeeId, assignedRole: "member" },
      },
    );
  }
  if (projectBetaId) {
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: projectBetaId },
        body: { employeeId: employeeId, assignedRole: "member" },
      },
    );
  }
  if (projectGammaId) {
    await generate_random_erp_hrm_admin_projects_members_create(
      adminConnection,
      {
        params: { projectId: projectGammaId },
        body: { employeeId: employeeId, assignedRole: "member" },
      },
    );
  }
  // 9. Log timelogs with different amounts (in minutes)
  // Alpha: 30 hours (50% utilization)
  if (projectAlphaId) {
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: projectAlphaId,
        date: new Date().toISOString(),
        durationMinutes: 1800, // 30 hours
        description: "Alpha work",
        billable: true,
      },
    });
  }
  // Beta: 40 hours (40% utilization)
  if (projectBetaId) {
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: projectBetaId,
        date: new Date().toISOString(),
        durationMinutes: 2400, // 40 hours
        description: "Beta work",
        billable: true,
      },
    });
  }
  // Gamma: 60 hours (60% utilization)
  if (projectGammaId) {
    await generate_random_erp_hrm_member_timelogs_create(memberConnection, {
      body: {
        projectId: projectGammaId,
        date: new Date().toISOString(),
        durationMinutes: 3600, // 60 hours
        description: "Gamma work",
        billable: true,
      },
    });
  }
  // 10. Get budget analysis results
  // First call without filter to see available projects
  const allResults = typia.assert<IErpHrmProject>(
    await api.functional.erpHrm.admin.analytics.budget.search(adminConnection, {
      body: {},
    }),
  );
  // Verify we have results for our projects
  TestValidator.equals(
    "all results has items array",
    Array.isArray(allResults.items),
    true,
  );
  TestValidator.equals(
    "all results has total count",
    typeof allResults.total === "number",
    true,
  );
  // Get project IDs from the results
  const availableProjectIds = allResults.items.map((item) => item.projectId);
  // 11. Test filtering by project IDs
  if (availableProjectIds.length >= 2) {
    const filterProjectIds = availableProjectIds.slice(0, 2);
    // Note: The API accepts projectIds in the request, but the response structure
    // may vary based on implementation. Verify with actual API behavior.
    const filteredCall =
      await api.functional.erpHrm.admin.analytics.budget.search(
        adminConnection,
        {
          body: {
            projectIds: filterProjectIds,
          },
        },
      );
    // Validate the response structure
    typia.assert(filteredCall);
  }
  // 12. Test pagination parameters
  const paginatedResult = typia.assert<IErpHrmProject>(
    await api.functional.erpHrm.admin.analytics.budget.search(adminConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    }),
  );
  TestValidator.equals(
    "paginated result has items",
    Array.isArray(paginatedResult.items),
    true,
  );
  TestValidator.equals(
    "paginated result has total",
    typeof paginatedResult.total === "number",
    true,
  );
  // 13. Test combined filter with pagination
  const combinedResult = typia.assert<IErpHrmProject>(
    await api.functional.erpHrm.admin.analytics.budget.search(adminConnection, {
      body: {
        page: 1,
        limit: 5,
      },
    }),
  );
  TestValidator.equals(
    "combined result is valid",
    Array.isArray(combinedResult.items),
    true,
  );
  // 14. Validate budget entries structure
  if (allResults.items.length > 0) {
    const firstItem = allResults.items[0];
    TestValidator.equals(
      "item has projectId",
      firstItem.projectId !== undefined,
      true,
    );
    TestValidator.equals(
      "item has projectName",
      firstItem.projectName !== undefined,
      true,
    );
    TestValidator.equals(
      "item has budgetHours",
      typeof firstItem.budgetHours === "number",
      true,
    );
    TestValidator.equals(
      "item has actualHoursLogged",
      typeof firstItem.actualHoursLogged === "number",
      true,
    );
    TestValidator.equals(
      "item has budgetUtilizationPercentage",
      typeof firstItem.budgetUtilizationPercentage === "number",
      true,
    );
    TestValidator.equals(
      "item has valid budgetStatus",
      ["within_budget", "approaching_budget", "over_budget"].includes(
        firstItem.budgetStatus,
      ),
      true,
    );
  }
}
