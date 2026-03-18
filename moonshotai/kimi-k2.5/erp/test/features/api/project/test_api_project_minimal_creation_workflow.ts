import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";

export async function test_api_project_minimal_creation_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member with project management permission
  const managerConnection: api.IConnection = { host: connection.host };
  const manager = await authorize_member_join(managerConnection, {});
  typia.assert(manager);
  // 2. Create an organization to establish the context for project creation
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create a new project providing only the required name field
  const projectName = RandomGenerator.name(2);
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {
      body: {
        name: projectName,
      },
    },
  );
  typia.assert(project);
  // 4. Validate the project is created with default status and correct context
  TestValidator.equals("project name matches input", project.name, projectName);
  TestValidator.equals(
    "project status defaults to active",
    project.status,
    "active",
  );
  TestValidator.equals(
    "organization context is set correctly",
    project.organization.id,
    organization.id,
  );
  TestValidator.equals("color_code is null", project.color_code, null);
  TestValidator.equals("description is null", project.description, null);
  TestValidator.equals("budget_hours is null", project.budget_hours, null);
  TestValidator.equals("start_date is null", project.start_date, null);
  TestValidator.equals("end_date is null", project.end_date, null);
  TestValidator.equals(
    "project has no members initially",
    project.projectMembers_count,
    0,
  );
}
