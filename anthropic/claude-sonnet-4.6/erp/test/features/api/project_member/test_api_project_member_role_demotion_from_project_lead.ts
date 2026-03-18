import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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
import { generate_random_erp_hrm_member_organizations_members_create } from "../../../generate/generate_random_erp_hrm_member_organizations_members_create";
import { generate_random_erp_hrm_member_organizations_roles_create } from "../../../generate/generate_random_erp_hrm_member_organizations_roles_create";
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";
import { prepare_random_erp_hrm_role } from "../../../prepare/prepare_random_erp_hrm_role";

export async function test_api_project_member_role_demotion_from_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register primary member (organization owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create organization — owner gets all permissions including project:manage
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Register second member
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuth = await authorize_member_join(
    secondMemberConnection,
    {},
  );
  typia.assert(secondMemberAuth);
  // 4. Create a custom role for the org (with employee:view permission)
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: "TestRole_" + RandomGenerator.alphabets(6),
          permissions: ["employee:view"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // 5. Add second member to the organization with the custom role
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: secondMemberAuth.member.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember);
  // 6. Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // 7. Assign second org member to the project with role 'project-lead'
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: orgMember.id,
          projectRole: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  TestValidator.equals(
    "initial project role is project-lead",
    projectMember.projectRole,
    "project-lead",
  );
  // === Case A: Demote project-lead → member ===
  const demotedMember =
    await api.functional.erpHrm.member.projects.members.update(
      ownerConnection,
      {
        projectId: project.id,
        projectMemberId: projectMember.id,
        body: {
          project_role: "member",
        } satisfies IErpHrmProjectMember.IUpdate,
      },
    );
  typia.assert(demotedMember);
  // Verify role was changed to 'member'
  TestValidator.equals(
    "demoted role is member",
    demotedMember.projectRole,
    "member",
  );
  // Verify id unchanged
  TestValidator.equals(
    "membership id unchanged",
    demotedMember.id,
    projectMember.id,
  );
  // Verify project unchanged
  TestValidator.equals(
    "project id unchanged",
    demotedMember.project.id,
    project.id,
  );
  // Verify org member unchanged
  TestValidator.equals(
    "org member id unchanged",
    demotedMember.organizationMember.id,
    orgMember.id,
  );
  // Verify membership still active
  TestValidator.equals("deletedAt is null", demotedMember.deletedAt, null);
  // === Case B: No-op update (same role 'member' again) ===
  const noOpMember = await api.functional.erpHrm.member.projects.members.update(
    ownerConnection,
    {
      projectId: project.id,
      projectMemberId: projectMember.id,
      body: {
        project_role: "member",
      } satisfies IErpHrmProjectMember.IUpdate,
    },
  );
  typia.assert(noOpMember);
  // Verify idempotent update returns same role
  TestValidator.equals(
    "no-op update still has member role",
    noOpMember.projectRole,
    "member",
  );
  // Verify id still unchanged
  TestValidator.equals(
    "id unchanged after no-op",
    noOpMember.id,
    projectMember.id,
  );
}
