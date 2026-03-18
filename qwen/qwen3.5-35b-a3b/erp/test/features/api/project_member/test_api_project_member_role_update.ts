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

export async function test_api_project_member_role_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register manager user (will become organization owner)
  const managerAuthorized = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuthorized);
  // Create manager-specific connection
  const managerConnection: api.IConnection = { host: connection.host };
  managerConnection.headers = {
    Authorization: managerAuthorized.token.access,
  };
  // 2. Register employee user
  const employeeAuthorized = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuthorized);
  // 3. Manager joins organization (creates organization as owner)
  const organizationMembership =
    await api.functional.hrms.member.organization_members.create(
      managerConnection,
      {
        body: {
          hrms_member_id: managerAuthorized.id,
          hrms_organization_id: typia.random<string & tags.Format<"uuid">>(),
          hrms_organization_role_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(organizationMembership);
  // 4. Manager creates project in organization
  const projectResponse =
    await api.functional.hrms.member.organizations.projects.create(
      managerConnection,
      {
        organizationId: organizationMembership.organization.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          color_code: `#${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(projectResponse);
  // Extract project ID from response - cast to get id property
  const project = projectResponse as unknown as IHrmsProject.ISummary;
  const projectId = project.id;
  // 5. Manager adds employee to project as 'member' role
  const employeeProjectMember =
    await api.functional.hrms.member.projects.members.addMember(
      managerConnection,
      {
        projectId,
        body: {
          employee_id: employeeAuthorized.id,
          role: "member",
        } satisfies IHrmsProjectMember.ICreate,
      },
    );
  typia.assert(employeeProjectMember);
  // Verify initial role is 'member'
  TestValidator.equals(
    "initial role should be member",
    employeeProjectMember.role,
    "member",
  );
  // 6. Update project membership to change role from 'member' to 'project-lead'
  const updatedMember =
    await api.functional.hrms.member.projects.members.update(
      managerConnection,
      {
        projectId,
        memberId: employeeProjectMember.id,
        body: {
          role: "project-lead",
        } satisfies IHrmsProjectMember.IUpdate,
      },
    );
  typia.assert(updatedMember);
  // 7. Verify response contains role='project-lead'
  TestValidator.equals(
    "updated role should be project-lead",
    updatedMember.role,
    "project-lead",
  );
  // 8. Verify employee matches
  TestValidator.equals(
    "employee matches",
    updatedMember.employee.id,
    employeeAuthorized.id,
  );
  // 9. Verify project matches
  TestValidator.equals("project matches", updatedMember.project.id, projectId);
  // 10. Verify the role changed successfully
  TestValidator.predicate(
    "role changed successfully",
    updatedMember.role === "project-lead",
  );
}
