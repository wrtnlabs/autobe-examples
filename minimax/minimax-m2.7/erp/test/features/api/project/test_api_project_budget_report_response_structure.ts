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

export async function test_api_project_budget_report_response_structure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const authorized = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create new connection with admin token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
      },
    },
  );
  typia.assert(organization);
  // 4. Create project with budgetHours = 100
  const project = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color: "#FF5733",
        budgetHours: 100,
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Call budget report endpoint
  const budgetReport =
    await api.functional.erpHrm.admin.projects.analytics.budget.budgetReport(
      adminConnection,
    );
  typia.assert(budgetReport);
  // 6. Validate response structure
  // Response has items array and total number
  TestValidator.equals("total equals 1", budgetReport.total, 1);
  TestValidator.predicate("items is array", Array.isArray(budgetReport.items));
  TestValidator.equals("items length is 1", budgetReport.items.length, 1);
  // Validate each item structure
  const item = budgetReport.items[0];
  TestValidator.predicate(
    "projectId is UUID format",
    /^[0-9a-f-]{36}$/i.test(item.projectId),
  );
  TestValidator.predicate(
    "projectName is string",
    typeof item.projectName === "string",
  );
  TestValidator.equals("budgetHours is 100", item.budgetHours, 100);
  TestValidator.predicate(
    "actualHoursLogged is number",
    typeof item.actualHoursLogged === "number",
  );
  TestValidator.predicate(
    "budgetUtilizationPercentage is number",
    typeof item.budgetUtilizationPercentage === "number",
  );
  // Validate budgetStatus enum values
  const validBudgetStatuses = [
    "within_budget",
    "approaching_budget",
    "over_budget",
  ] as const;
  TestValidator.predicate(
    "budgetStatus is valid enum value",
    validBudgetStatuses.includes(item.budgetStatus),
  );
}
