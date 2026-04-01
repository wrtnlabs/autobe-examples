import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_members_create } from "../../../generate/generate_random_hrm_platform_member_projects_members_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_member } from "../../../prepare/prepare_random_hrm_platform_project_member";

export async function test_api_project_member_retrieve_project_lead_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create organization (automatically creates member as employee with Owner role)
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(organization);
  // 3. Select the created organization as active context
  const selectedOrg =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(selectedOrg);
  TestValidator.equals("organization matches", selectedOrg.id, organization.id);
  // 4. Create a project
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        color_code: "#3498db",
        status: "active",
      },
    },
  );
  typia.assert(project);
  // 5. Create project membership with project-lead role
  const membership =
    await generate_random_hrm_platform_member_projects_members_create(
      memberConnection,
      {
        params: {
          projectId: project.id,
        },
        body: {
          role: "project-lead",
        },
      },
    );
  typia.assert(membership);
  // 6. Retrieve the membership record
  const retrievedMembership =
    await api.functional.hrmPlatform.member.projects.members.at(
      memberConnection,
      {
        projectId: project.id,
        membershipId: membership.id,
      },
    );
  typia.assert(retrievedMembership);
  // Validate membership details - business logic validation
  TestValidator.equals(
    "membership ID matches",
    retrievedMembership.id,
    membership.id,
  );
  TestValidator.equals(
    "role is project-lead",
    retrievedMembership.role,
    "project-lead",
  );
  TestValidator.equals(
    "employee ID matches",
    retrievedMembership.employee.id,
    membership.employee.id,
  );
  TestValidator.equals(
    "project ID matches",
    retrievedMembership.project.id,
    project.id,
  );
  TestValidator.equals(
    "project name matches",
    retrievedMembership.project.name,
    project.name,
  );
  TestValidator.equals(
    "project color matches",
    retrievedMembership.project.color_code,
    project.color_code,
  );
  TestValidator.equals(
    "project status matches",
    retrievedMembership.project.status,
    "active",
  );
  // Validate employee summary has required fields (business validation, not type)
  TestValidator.equals(
    "employee display name exists",
    retrievedMembership.employee.user.display_name !== "",
    true,
  );
  TestValidator.equals(
    "employee role name exists",
    retrievedMembership.employee.role.name !== "",
    true,
  );
  // Validate timestamps are valid date-time strings (business validation)
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(retrievedMembership.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(retrievedMembership.updated_at)),
  );
}