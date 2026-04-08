import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";

export async function test_api_project_retrieval_by_authorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  // Note: Organization must be pre-created and member must be associated via employee relation
  // For E2E testing, this assumes proper organization setup exists
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization and associate member (organization creation would require owner permissions)
  // For this test, we assume organization exists and member has access
  // In production, organization would be created through proper owner flow
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a project in the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          color_code: (`#${RandomGenerator.alphabets(6)}` satisfies string) as string & tags.Pattern<"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$">,
          status: "active",
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmProject.ICreate,
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 4. Retrieve the project using the SDK function
  const retrievedProject =
    await api.functional.hrm.member.organizations.projects.getByOrganizationidAndProjectid(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
      },
    );
  typia.assert(retrievedProject);
  // 5. Validate project fields match
  TestValidator.equals("project id matches", retrievedProject.id, project.id);
  TestValidator.equals(
    "project name matches",
    retrievedProject.name,
    project.name,
  );
  TestValidator.equals(
    "project color code matches",
    retrievedProject.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "project status matches",
    retrievedProject.status,
    project.status,
  );
  TestValidator.equals(
    "organization id matches",
    retrievedProject.organization.id,
    organizationId,
  );
  // 6. Validate optional description if present
  if (project.description !== undefined && project.description !== null) {
    TestValidator.equals(
      "project description matches",
      retrievedProject.description,
      project.description,
    );
  }
}