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

export async function test_api_project_budget_report_with_various_utilization_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmAdmin.ILogin,
  });
  // 2. Create organization owned by authenticated admin
  const organization = await api.functional.erpHrm.admin.organizations.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<12>,
      } satisfies IErpHrmOrganization.ICreate,
    },
  );
  typia.assert(organization);
  // 3. Create first employee (for Project A and C)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const invitation1 = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: member1Auth.email,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(invitation1);
  // 4. Create second employee (for Project B)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const invitation2 = await api.functional.erpHrm.admin.employees.create(
    adminConnection,
    {
      body: {
        email: member2Auth.email,
        roleId: typia.random<string & tags.Format<"uuid">>(),
        employmentType: "full-time",
      } satisfies IErpHrmEmployee.ICreate,
    },
  );
  typia.assert(invitation2);
  // 5. Set organization context for both members
  await api.functional.erpHrm.member.organization_context.select(
    member1Connection,
    {
      body: {
        organizationId: organization.id,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  await api.functional.erpHrm.member.organization_context.select(
    member2Connection,
    {
      body: {
        organizationId: organization.id,
      } satisfies IErpHrmOrganizationContext.ICreate,
    },
  );
  // 6. Create three projects with 100 budget hours each
  const projectAResponse = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        budgetHours: 100,
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  const projectA = typia.assert<IErpHrmProject & { id: string }>(projectAResponse);
  const projectBResponse = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#4A90E2",
        budgetHours: 100,
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  const projectB = typia.assert<IErpHrmProject & { id: string }>(projectBResponse);
  const projectCResponse = await api.functional.erpHrm.admin.projects.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        color: "#50C878",
        budgetHours: 100,
        status: "active",
      } satisfies IErpHrmProject.ICreate,
    },
  );
  const projectC = typia.assert<IErpHrmProject & { id: string }>(projectCResponse);
  // 8. Log timelogs to achieve target utilization
  const baseDate = new Date().toISOString().split("T")[0] + "T00:00:00.000Z";
  // For Project A - 40 hours = 2400 minutes (within_budget - 40%)
  await api.functional.erpHrm.member.timelogs.create(member1Connection, {
    body: {
      projectId: projectA.id,
      date: baseDate,
      durationMinutes: 2400,
      description: "Within budget project work",
      billable: true,
    } satisfies IErpHrmTimelog.ICreate,
  });
  // For Project B - 85 hours = 5100 minutes (approaching_budget - 85%)
  await api.functional.erpHrm.member.timelogs.create(member2Connection, {
    body: {
      projectId: projectB.id,
      date: baseDate,
      durationMinutes: 5100,
      description: "Approaching budget project work",
      billable: true,
    } satisfies IErpHrmTimelog.ICreate,
  });
  // For Project C - 120 hours = 7200 minutes (over_budget - 120%)
  await api.functional.erpHrm.member.timelogs.create(member1Connection, {
    body: {
      projectId: projectC.id,
      date: baseDate,
      durationMinutes: 7200,
      description: "Over budget project work",
      billable: true,
    } satisfies IErpHrmTimelog.ICreate,
  });
  // 9. Call the budget analytics endpoint
  const budgetResultResponse =
    await api.functional.erpHrm.admin.analytics.budget.search(adminConnection, {
      body: {} satisfies IErpHrmBudgetAnalysis.IRequest,
    });
  const budgetResult = typia.assert<IErpHrmBudgetAnalysis.IResult & { data: IErpHrmBudgetAnalysis.IResult[] }>(budgetResultResponse).data;
  // 10. Validate results
  TestValidator.equals(
    "should have 3 projects with budget",
    budgetResult.length,
    3,
  );
  // Verify ordering by utilizationPercentage descending (Project C first, then B, then A)
  TestValidator.predicate("results ordered by utilization descending", () => {
    return (
      budgetResult[0].budgetStatus === "over_budget" &&
      budgetResult[1].budgetStatus === "approaching_budget" &&
      budgetResult[2].budgetStatus === "within_budget"
    );
  });
  // Verify Project C (over_budget - 120%)
  const overBudgetProject = budgetResult[0];
  TestValidator.equals(
    "over budget project budget hours",
    overBudgetProject.budgetHours,
    100,
  );
  TestValidator.equals(
    "over budget project actual hours",
    overBudgetProject.actualHours,
    120,
  );
  TestValidator.equals(
    "over budget project utilization",
    overBudgetProject.utilizationPercentage,
    120,
  );
  TestValidator.equals(
    "over budget project status",
    overBudgetProject.budgetStatus,
    "over_budget",
  );
  // Verify Project B (approaching_budget - 85%)
  const approachingBudgetProject = budgetResult[1];
  TestValidator.equals(
    "approaching budget project budget hours",
    approachingBudgetProject.budgetHours,
    100,
  );
  TestValidator.equals(
    "approaching budget project actual hours",
    approachingBudgetProject.actualHours,
    85,
  );
  TestValidator.equals(
    "approaching budget project utilization",
    approachingBudgetProject.utilizationPercentage,
    85,
  );
  TestValidator.equals(
    "approaching budget project status",
    approachingBudgetProject.budgetStatus,
    "approaching_budget",
  );
  // Verify Project A (within_budget - 40%)
  const withinBudgetProject = budgetResult[2];
  TestValidator.equals(
    "within budget project budget hours",
    withinBudgetProject.budgetHours,
    100,
  );
  TestValidator.equals(
    "within budget project actual hours",
    withinBudgetProject.actualHours,
    40,
  );
  TestValidator.equals(
    "within budget project utilization",
    withinBudgetProject.utilizationPercentage,
    40,
  );
  TestValidator.equals(
    "within budget project status",
    withinBudgetProject.budgetStatus,
    "within_budget",
  );
  // Verify each project includes project summary
  TestValidator.predicate(
    "project includes id",
    () => !!overBudgetProject.project?.id,
  );
  TestValidator.predicate(
    "project includes name",
    () => !!overBudgetProject.project?.name,
  );
  TestValidator.predicate(
    "project includes color",
    () => !!overBudgetProject.project?.color,
  );
  TestValidator.predicate(
    "project includes status",
    () => !!overBudgetProject.project?.status,
  );
}