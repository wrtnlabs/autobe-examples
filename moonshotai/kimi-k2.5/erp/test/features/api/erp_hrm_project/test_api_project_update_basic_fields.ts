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

/**
 * Test the primary success path for updating project details. A member with project management permission creates an organization, then creates a project, and subsequently updates the project name, description, color code, and budget hours. Verify that the update succeeds and all provided fields are persisted correctly in the response. The test should validate that the updated_at timestamp reflects the modification time and that the project retains its original id and organization context.
 */
export async function test_api_project_update_basic_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create organization
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Create project
  const project = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: {},
    },
  );
  typia.assert(project);
  // 4. Update project with new values
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 5 }),
    colorCode: "#" + RandomGenerator.alphaNumeric(6),
    description: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    budgetHours: 100 + Math.random() * 900,
  } satisfies IErpHrmProject.IUpdate;
  const updatedProject = await api.functional.erpHrm.member.projects.update(
    memberConnection,
    {
      projectId: project.id,
      body: updateBody,
    },
  );
  typia.assert(updatedProject);
  // 5. Validate updated fields are persisted correctly
  TestValidator.equals(
    "name matches update",
    updatedProject.name,
    updateBody.name,
  );
  TestValidator.equals(
    "color_code matches update",
    updatedProject.color_code,
    updateBody.colorCode,
  );
  TestValidator.equals(
    "description matches update",
    updatedProject.description,
    updateBody.description,
  );
  TestValidator.equals(
    "budget_hours matches update",
    updatedProject.budget_hours,
    updateBody.budgetHours,
  );
  // 6. Validate unchanged fields remain the same
  TestValidator.equals("id unchanged", updatedProject.id, project.id);
  TestValidator.equals(
    "organization id unchanged",
    updatedProject.organization.id,
    project.organization.id,
  );
  // 7. Validate updated_at reflects modification (should be different)
  TestValidator.notEquals(
    "updated_at changed",
    updatedProject.updated_at,
    project.updated_at,
  );
}
