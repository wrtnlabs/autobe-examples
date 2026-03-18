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

export async function test_api_project_full_creation_with_all_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create organization to establish context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Prepare project creation with all available fields populated
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const projectBody = {
    name: RandomGenerator.name(3),
    colorCode: "#FF5733",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active" as const,
    budgetHours: 100.5,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  } satisfies IErpHrmProject.ICreate;
  // Create project with all fields
  const project = await api.functional.erpHrm.member.projects.create(
    memberConnection,
    {
      body: projectBody,
    },
  );
  typia.assert(project);
  // Verify project was created with provided values
  TestValidator.equals(
    "project name matches input",
    project.name,
    projectBody.name,
  );
  TestValidator.equals(
    "project color code matches input",
    project.color_code,
    projectBody.colorCode,
  );
  TestValidator.equals(
    "project description matches input",
    project.description,
    projectBody.description,
  );
  TestValidator.equals(
    "project status matches input",
    project.status,
    projectBody.status,
  );
  TestValidator.equals(
    "project budget hours matches input",
    project.budget_hours,
    projectBody.budgetHours,
  );
  TestValidator.equals(
    "project start date matches input",
    project.start_date,
    projectBody.startDate,
  );
  TestValidator.equals(
    "project end date matches input",
    project.end_date,
    projectBody.endDate,
  );
  // Verify organization_id is set from session context
  TestValidator.equals(
    "project organization id matches context",
    project.organization.id,
    organization.id,
  );
  // Verify timestamps are auto-generated
  TestValidator.predicate(
    "project created_at is defined",
    project.created_at !== null,
  );
  TestValidator.predicate(
    "project updated_at is defined",
    project.updated_at !== null,
  );
  // Verify project is ready for use (member count should be 0 for new project)
  TestValidator.equals(
    "project members count is zero",
    project.projectMembers_count,
    0,
  );
}
