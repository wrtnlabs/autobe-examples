import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_budget_report_with_zero_hours_logged(
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
  typia.assert(organization);
  // 3. Create Project A with budget hours (100 hours, no timelogs)
  const projectAName = `Project A - ${RandomGenerator.alphabets(8)}`;
  await generate_random_erp_hrm_admin_projects_create(adminConnection, {
    body: {
      name: projectAName,
      color: "#FF5733",
      budgetHours: 100,
      status: "active",
    } satisfies IErpHrmProject.ICreate,
  });
  // 4. Create Project B with budget hours (50 hours, no timelogs)
  const projectBName = `Project B - ${RandomGenerator.alphabets(8)}`;
  await generate_random_erp_hrm_admin_projects_create(adminConnection, {
    body: {
      name: projectBName,
      color: "#4A90E2",
      budgetHours: 50,
      status: "active",
    } satisfies IErpHrmProject.ICreate,
  });
  // 5. Call the budget report endpoint
  const budgetReport =
    await api.functional.erpHrm.admin.projects.analytics.budget.budgetReport(
      adminConnection,
    );
  typia.assert(budgetReport);
  // 6. Validate response structure
  TestValidator.equals("total projects with budget", budgetReport.total, 2);
  TestValidator.equals("items count", budgetReport.items.length, 2);
  // 7. Find both projects in the report by name
  const projectAEntry = budgetReport.items.find(
    (item) => item.projectName === projectAName,
  );
  const projectBEntry = budgetReport.items.find(
    (item) => item.projectName === projectBName,
  );
  TestValidator.predicate(
    "Project A found in report",
    projectAEntry !== undefined,
  );
  TestValidator.predicate(
    "Project B found in report",
    projectBEntry !== undefined,
  );
  // 8. Validate Project A entry
  if (projectAEntry) {
    TestValidator.equals(
      "Project A budget hours",
      projectAEntry.budgetHours,
      100,
    );
    TestValidator.equals(
      "Project A actual hours",
      projectAEntry.actualHoursLogged,
      0,
    );
    TestValidator.equals(
      "Project A utilization",
      projectAEntry.budgetUtilizationPercentage,
      0.0,
    );
    TestValidator.equals(
      "Project A status",
      projectAEntry.budgetStatus,
      "within_budget",
    );
  }
  // 9. Validate Project B entry
  if (projectBEntry) {
    TestValidator.equals(
      "Project B budget hours",
      projectBEntry.budgetHours,
      50,
    );
    TestValidator.equals(
      "Project B actual hours",
      projectBEntry.actualHoursLogged,
      0,
    );
    TestValidator.equals(
      "Project B utilization",
      projectBEntry.budgetUtilizationPercentage,
      0.0,
    );
    TestValidator.equals(
      "Project B status",
      projectBEntry.budgetStatus,
      "within_budget",
    );
  }
  // 10. Validate sorting (by utilization percentage descending, both are 0%)
  // Both entries have 0% utilization, so stable order is acceptable
  TestValidator.predicate(
    "report contains both projects",
    budgetReport.items.length === 2 &&
      budgetReport.items.some((item) => item.projectName === projectAName) &&
      budgetReport.items.some((item) => item.projectName === projectBName),
  );
}
