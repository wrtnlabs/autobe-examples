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

export async function test_api_project_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to establish session context
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization to establish organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create project to have a retrievable project record
  const createdProject = await generate_random_erp_hrm_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(createdProject);
  // 4. Retrieve the project by ID
  const retrievedProject = await api.functional.erpHrm.member.projects.at(
    memberConnection,
    {
      projectId: createdProject.id,
    },
  );
  typia.assert(retrievedProject);
  // 5. Validate retrieved project matches created project
  TestValidator.equals(
    "project ID matches",
    retrievedProject.id,
    createdProject.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    createdProject.name,
  );
  TestValidator.equals(
    "project status matches",
    retrievedProject.status,
    createdProject.status,
  );
  TestValidator.equals(
    "project color_code matches",
    retrievedProject.color_code,
    createdProject.color_code,
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
    "project start_date matches",
    retrievedProject.start_date,
    createdProject.start_date,
  );
  TestValidator.equals(
    "project end_date matches",
    retrievedProject.end_date,
    createdProject.end_date,
  );
  TestValidator.equals(
    "organization reference matches",
    retrievedProject.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "projectMembers_count is valid",
    retrievedProject.projectMembers_count >= 0,
  );
}
