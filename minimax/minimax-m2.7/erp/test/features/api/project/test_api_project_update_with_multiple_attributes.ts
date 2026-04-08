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

interface IProjectSnapshot extends IErpHrmProject {
  id: string & tags.Format<"uuid">;
  name: string & tags.MinLength<1>;
  description: string;
  color: string & tags.Pattern<"^#[0-9A-Fa-f]{6}$">;
  budgetHours: number & tags.Minimum<0>;
  status: "active" | "inactive" | "archived";
}

export async function test_api_project_update_with_multiple_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create an organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create a project with initial attributes (active status, 100 budget hours)
  const initialProject = typia.assert<IProjectSnapshot>(
    await generate_random_erp_hrm_admin_projects_create(
      adminConnection,
      {
        body: {
          name: `Initial Project ${RandomGenerator.alphabets(8)}`,
          color: "#FF5733",
          status: "active",
          budgetHours: 100,
          description: "Initial description",
        },
      },
    ),
  );
  // 4. Update project with multiple attributes
  const updatedName = `Updated Project ${RandomGenerator.alphabets(8)}`;
  const newDescription =
    "Updated description for testing multiple attribute updates";
  const newColor = "#3A7BC8";
  const newBudgetHours = 150;
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const updatedProject = await api.functional.erpHrm.admin.projects.update(
    adminConnection,
    {
      projectId: initialProject.id,
      body: {
        name: updatedName,
        description: newDescription,
        color: newColor,
        budgetHours: newBudgetHours,
        startDate: startDate,
        endDate: endDate,
      } satisfies IErpHrmProject.IUpdate,
    },
  );
  const project = typia.assert<IProjectSnapshot>(updatedProject);
  // Validations
  TestValidator.equals(
    "project name updated",
    project.name,
    updatedName,
  );
  TestValidator.equals(
    "description updated",
    project.description,
    newDescription,
  );
  TestValidator.equals("color updated", project.color, newColor);
  TestValidator.equals(
    "budget hours updated to 150",
    project.budgetHours,
    newBudgetHours,
  );
  TestValidator.predicate(
    "color is valid hex format",
    /^#[0-9A-Fa-f]{6}$/.test(project.color ?? ""),
  );
  TestValidator.predicate(
    "status remains active",
    project.status === "active",
  );
}