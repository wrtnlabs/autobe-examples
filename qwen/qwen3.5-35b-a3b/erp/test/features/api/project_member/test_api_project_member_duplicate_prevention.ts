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

export async function test_api_project_member_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as organization owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IHrmsMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(owner);
  // 2. Create employee account
  const employeeConnection: api.IConnection = { host: connection.host };
  const employee: IHrmsMember.IAuthorized = await authorize_member_join(
    employeeConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(employee);
  // 3. Create organization and assign employee to it
  const organizationMembership: IHrmsOrganizationMember =
    await api.functional.hrms.member.organization_members.create(
      ownerConnection,
      {
        body: {
          hrms_member_id: employee.id,
          hrms_organization_id:
            owner.organization_memberships[0].organization.id,
          hrms_organization_role_id:
            owner.organization_memberships[0].organizationRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMembership);
  // 4. Create project in organization
  const project: IHrmsProject =
    await api.functional.hrms.member.organizations.projects.create(
      ownerConnection,
      {
        organizationId: organizationMembership.organization.id,
        body: {
          name: RandomGenerator.name(),
          color_code: "#3498db",
          description: null,
        } satisfies IHrmsProject.ICreate,
      },
    );
  typia.assert(project);
  // 5. First successful member assignment
  const firstMembership: IHrmsProjectMember =
    await api.functional.hrms.member.projects.members.addMember(
      ownerConnection,
      {
        projectId: (project as any).id as string,
        body: {
          employee_id: employee.id,
          role: "member",
        } satisfies IHrmsProjectMember.ICreate,
      },
    );
  typia.assert(firstMembership);
  // 6. Attempt duplicate assignment (should fail with 409 Conflict)
  await TestValidator.error(
    "duplicate project membership should fail",
    async () => {
      await api.functional.hrms.member.projects.members.addMember(
        ownerConnection,
        {
          projectId: (project as any).id as string,
          body: {
            employee_id: employee.id,
            role: "project-lead",
          } satisfies IHrmsProjectMember.ICreate,
        },
      );
    },
  );
}