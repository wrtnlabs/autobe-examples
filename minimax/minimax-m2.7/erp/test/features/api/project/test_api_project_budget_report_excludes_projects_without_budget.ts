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

export async function test_api_project_budget_report_excludes_projects_without_budget(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const authorized = await authorize_admin_join(connection, {});
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create project without budget hours configured (undefined)
  const projectWithoutBudget =
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        color: "#FF5733",
        description: "Project without budget hours configured",
        status: "active",
        budgetHours: undefined,
      },
    });
  typia.assert(projectWithoutBudget);
  // 4. Create project with budgetHours set to 0
  const projectWithZeroBudget =
    await generate_random_erp_hrm_admin_projects_create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        color: "#4A90E2",
        description: "Project with zero budget hours",
        status: "active",
        budgetHours: 0,
      },
    });
  typia.assert(projectWithZeroBudget);
  // 5. Get budget report
  const budgetReport =
    await api.functional.erpHrm.admin.projects.analytics.budget.budgetReport(
      adminConnection,
    );
  typia.assert(budgetReport);
  // 6. Validate that projects without budget hours are excluded
  TestValidator.equals("total projects should be 0", budgetReport.total, 0);
  TestValidator.equals(
    "items array should be empty",
    budgetReport.items.length,
    0,
  );
}
