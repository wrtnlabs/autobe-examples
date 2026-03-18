import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import type { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
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
import { generate_random_hrms_member_projects_members_add_member } from "../../../generate/generate_random_hrms_member_projects_members_add_member";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_project } from "../../../prepare/prepare_random_hrms_project";
import { prepare_random_hrms_project_member } from "../../../prepare/prepare_random_hrms_project_member";

export async function test_api_project_member_without_permission_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Manager with project:manage permission
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuth = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Manager creates organization as owner (first member creates org)
  const orgMembership1 =
    await api.functional.hrms.member.organization_members.create(
      managerConnection,
      {
        body: {
          hrms_member_id: managerAuth.id,
          hrms_organization_id: typia.random<string & tags.Format<"uuid">>(),
          hrms_organization_role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(orgMembership1);
  // 3. Add member to same organization with different role (no project:manage)
  const orgMembership2 =
    await api.functional.hrms.member.organization_members.create(
      managerConnection,
      {
        body: {
          hrms_member_id: memberAuth.id,
          hrms_organization_id: orgMembership1.organization.id,
          hrms_organization_role_id: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(orgMembership2);
  // 4. Manager creates a project
  const project =
    await api.functional.hrms.member.organizations.projects.create(
      managerConnection,
      {
        organizationId: orgMembership1.organization.id,
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${RandomGenerator.alphaNumeric(6).toUpperCase()}`,
        },
      },
    );
  typia.assert(project);
  // 5. Manager adds member as project member
  const projectMember =
    await api.functional.hrms.member.projects.members.addMember(
      managerConnection,
      {
        projectId: (project as any).id,
        body: {
          employee_id: memberAuth.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMember);
  const initialRole = projectMember.role;
  const initialStatus = projectMember.status;
  // 6. Try to update project membership as regular employee (no project:manage permission)
  await TestValidator.httpError(
    "member without project:manage permission should be forbidden",
    403,
    async () => {
      await api.functional.hrms.member.projects.members.update(
        memberConnection,
        {
          projectId: (project as any).id,
          memberId: projectMember.id,
          body: {
            role: "project-lead",
          },
        },
      );
    },
  );
  // 7. Verify membership data remains unchanged by fetching current state
  const updatedMember =
    await api.functional.hrms.member.projects.members.update(memberConnection, {
      projectId: (project as any).id,
      memberId: projectMember.id,
      body: {},
    });
  typia.assert(updatedMember);
  TestValidator.equals("role unchanged", updatedMember.role, initialRole);
  TestValidator.equals("status unchanged", updatedMember.status, initialStatus);
}