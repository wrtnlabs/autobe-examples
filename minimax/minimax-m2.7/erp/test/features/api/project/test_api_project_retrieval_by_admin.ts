import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_projects_create } from "../../../generate/generate_random_erp_hrm_admin_projects_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create a new project
  const projectName = RandomGenerator.paragraph({ sentences: 2 });
  const projectDescription = RandomGenerator.paragraph({ sentences: 3 });
  const projectColor = "#" + RandomGenerator.alphabets(6).toUpperCase();
  const projectBudgetHours = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<1000>
  >();
  const projectStartDate = new Date().toISOString();
  const projectEndDate = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createResponse = await generate_random_erp_hrm_admin_projects_create(
    adminConnection,
    {
      body: {
        name: projectName,
        description: projectDescription,
        color: projectColor,
        status: "active",
        budgetHours: projectBudgetHours,
        startDate: projectStartDate,
        endDate: projectEndDate,
      } satisfies IErpHrmProject.ICreate,
    },
  );
  typia.assert(createResponse);
  // 3. Retrieve the created project using GET /admin/projects/{projectId}
  const projectId = createResponse.items[0]!.projectId;
  const retrievedProject = await api.functional.erpHrm.admin.projects.at(
    adminConnection,
    {
      projectId: projectId,
    },
  );
  typia.assert(retrievedProject);
  // 4. Validations
  TestValidator.equals(
    "project id matches",
    retrievedProject.items[0]!.projectId,
    projectId,
  );
  TestValidator.equals(
    "project name matches",
    retrievedProject.items[0]!.projectName,
    projectName,
  );
  TestValidator.equals(
    "budget hours matches",
    retrievedProject.items[0]!.budgetHours,
    projectBudgetHours,
  );
  TestValidator.predicate(
    "has valid budget utilization",
    retrievedProject.items[0]!.budgetUtilizationPercentage >= 0,
  );
  TestValidator.predicate(
    "has valid budget status",
    ["within_budget", "approaching_budget", "over_budget"].includes(
      retrievedProject.items[0]!.budgetStatus,
    ),
  );
  TestValidator.equals("total count is 1", retrievedProject.total, 1);
}
