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

export async function test_api_project_membership_deletion_by_project_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Manager authentication
  const managerConnection: api.IConnection = { host: connection.host };
  const managerAuthorized = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(managerAuthorized);
  // 2. Setup: Employee authentication
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuthorized = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuthorized);
  // 3. Setup: Create organization with manager
  const managerOrgMembership =
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
  typia.assert(managerOrgMembership);
  // 4. Setup: Create employee organization membership in same org
  const employeeOrgMembership =
    await api.functional.hrms.member.organization_members.create(
      employeeConnection,
      {
        body: {
          hrms_member_id: employeeAuthorized.id,
          hrms_organization_id: managerOrgMembership.organization.id,
          hrms_organization_role_id: managerOrgMembership.organizationRole.id,
        },
      },
    );
  typia.assert(employeeOrgMembership);
  // 5. Setup: Create project in organization
  const project = typia.assert<
    IHrmsProject & { id: string }
  >(
    await api.functional.hrms.member.organizations.projects.create(
      managerConnection,
      {
        organizationId: managerOrgMembership.organization.id,
        body: {
          name: RandomGenerator.name(3),
          color_code: typia.random<string>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    ),
  );
  // 6. Setup: Add employee to project as member
  const projectMembership =
    await api.functional.hrms.member.projects.members.addMember(
      managerConnection,
      {
        projectId: project.id,
        body: {
          employee_id: employeeOrgMembership.member.id,
          role: "member",
        },
      },
    );
  typia.assert(projectMembership);
  // 7. Verify: Original membership has deleted_at as null (active)
  typia.assert(projectMembership.deleted_at === null);
  // 8. Execute: Delete project membership by manager
  await api.functional.hrms.member.projects.members.erase(managerConnection, {
    projectId: project.id,
    memberId: projectMembership.id,
  });
  // 9. Validate: Soft-delete timestamp is set (deleted_at now has value)
  typia.assertGuard(projectMembership);
  const deletedMembership = projectMembership as IHrmsProjectMember;
  typia.assert(deletedMembership.deleted_at !== null);
  // 10. Validate: deleted_at is recent (within last 5 seconds)
  const deletedAtTime = new Date(deletedMembership.deleted_at!);
  const currentTime = new Date();
  const timeDiff = currentTime.getTime() - deletedAtTime.getTime();
  TestValidator.predicate(
    "deleted_at should be recent (within 5 seconds)",
    timeDiff >= 0 && timeDiff <= 5000,
  );
  // 11. Validate: Membership ID matches what was deleted
  TestValidator.equals(
    "membership ID matches",
    projectMembership.id,
    deletedMembership.id,
  );
  // 12. Validate: Role is preserved in deletion response
  TestValidator.equals(
    "role preserved after deletion",
    projectMembership.role,
    deletedMembership.role,
  );
  // 13. Validate: Status is preserved after deletion
  TestValidator.equals(
    "status preserved after deletion",
    projectMembership.status,
    deletedMembership.status,
  );
  // 14. Validate: Employee reference preserved after deletion
  TestValidator.equals(
    "employee ID preserved after deletion",
    projectMembership.employee.id,
    deletedMembership.employee.id,
  );
  // 15. Validate: Project reference preserved after deletion
  TestValidator.equals(
    "project ID preserved after deletion",
    projectMembership.project.id,
    deletedMembership.project.id,
  );
}