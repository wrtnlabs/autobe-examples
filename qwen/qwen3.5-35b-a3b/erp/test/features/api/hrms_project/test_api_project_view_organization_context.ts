import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import type { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import type { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import type { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_projects_create } from "../../../generate/generate_random_hrms_member_organizations_projects_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";

export async function test_api_project_view_organization_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorizedMember);
  // 2. Extract the user's organization memberships from the join response
  const memberships = authorizedMember.organization_memberships;
  TestValidator.predicate(
    "member has at least one organization membership",
    memberships.length > 0,
  );
  // For multi-org test, we need at least 2 organizations
  // If only 1 exists, we'll test with that organization
  const firstOrgId = memberships[0].organization.id;
  const secondOrgId =
    memberships.length > 1 ? memberships[1].organization.id : firstOrgId;
  // 3. Create a project in the first organization
  const firstOrgConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedMember.token.access },
  };
  const projectRaw =
    await api.functional.hrms.member.organizations.projects.create(
      firstOrgConnection,
      {
        organizationId: firstOrgId,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          color_code: "#" + RandomGenerator.alphaNumeric(6),
        } satisfies IHrmsProject.ICreate,
      },
    );
  const project: IHrmsProject.ISummary =
    projectRaw as unknown as IHrmsProject.ISummary;
  typia.assert(project);
  TestValidator.equals(
    "project belongs to first organization",
    project.organization_id,
    firstOrgId,
  );
  // 4. Switch to the second organization context
  const switchConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedMember.token.access },
  };
  const newOrgContext =
    await api.functional.hrms.member.organizations._switch.switchOrganization(
      switchConnection,
      {
        body: { search: "" } as any,
      },
    );
  typia.assert(newOrgContext);
  // 5. Try to access project from the second organization (should fail)
  // The project belongs to firstOrgId, not secondOrgId
  await TestValidator.error(
    "project not accessible from different organization context",
    async () => {
      await api.functional.hrms.member.projects.at(switchConnection, {
        projectId: project.id,
      });
    },
  );
  // 6. Switch back to first organization and verify access
  const backToFirstOrg =
    await api.functional.hrms.member.organizations._switch.switchOrganization(
      switchConnection,
      {
        body: { search: "" } as any,
      },
    );
  typia.assert(backToFirstOrg);
  TestValidator.equals(
    "organization context switched back to first org",
    backToFirstOrg.id,
    firstOrgId,
  );
  // 7. Access project in correct organization context (should succeed)
  const projectAccessibleRaw = await api.functional.hrms.member.projects.at(
    switchConnection,
    { projectId: project.id },
  );
  const projectAccessible: IHrmsProject.ISummary =
    projectAccessibleRaw as unknown as IHrmsProject.ISummary;
  typia.assert(projectAccessible);
  TestValidator.equals(
    "project accessible in correct org",
    projectAccessible.id,
    project.id,
  );
  TestValidator.equals(
    "project organization matches current context",
    projectAccessible.organization_id,
    firstOrgId,
  );
}
