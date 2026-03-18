import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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

export async function test_api_project_detail_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a new organization (member automatically becomes Owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Switch to the newly created organization context
  const orgMember =
    await api.functional.erpHrm.member.organizations._switch.switchContext(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(orgMember);
  // Step 4: Create a project with all optional fields populated
  const startedAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // tomorrow
  const endedAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(); // 30 days from now
  const projectName = RandomGenerator.paragraph({ sentences: 2 });
  const projectColor = "#FF5733";
  const projectDescription = RandomGenerator.paragraph({ sentences: 5 });
  const projectBudgetHours = 100.5;
  const createBody = {
    name: projectName,
    color: projectColor,
    description: projectDescription,
    budget_hours: projectBudgetHours,
    started_at: startedAt,
    ended_at: endedAt,
  } satisfies IErpHrmProject.ICreate;
  const createdProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {
      body: createBody,
    },
  );
  typia.assert(createdProject);
  // Step 5: Retrieve the project by its ID
  const retrievedProject = await api.functional.erpHrm.member.projects.at(
    memberConnection,
    {
      projectId: createdProject.id,
    },
  );
  typia.assert(retrievedProject);
  // Step 6: Validate the retrieved project fields match the created project
  TestValidator.equals(
    "project id matches",
    retrievedProject.id,
    createdProject.id,
  );
  TestValidator.equals(
    "organization_id matches",
    retrievedProject.organization_id,
    organization.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    createdProject.name,
  );
  TestValidator.equals(
    "project color matches",
    retrievedProject.color,
    createdProject.color,
  );
  TestValidator.equals(
    "project status is active",
    retrievedProject.status,
    "active",
  );
  TestValidator.equals(
    "project description matches",
    retrievedProject.description,
    createdProject.description,
  );
  TestValidator.equals(
    "project budget_hours matches",
    retrievedProject.budget_hours,
    createdProject.budget_hours,
  );
  TestValidator.equals(
    "project started_at matches",
    retrievedProject.started_at,
    createdProject.started_at,
  );
  TestValidator.equals(
    "project ended_at matches",
    retrievedProject.ended_at,
    createdProject.ended_at,
  );
}
