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

export async function test_api_project_member_detail_retrieval_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register owner ───────────────────────────────────────────────
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ─── Step 2: Create organization ──────────────────────────────────────────
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // ─── Step 3: Register employee ────────────────────────────────────────────
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(employeeAuth);
  // ─── Step 4: Create limited custom role (no project:manage / project:view) ──
  const customRole =
    await generate_random_erp_hrm_member_organizations_roles_create(
      ownerConnection,
      {
        body: {
          name: `limited-role-${RandomGenerator.alphaNumeric(6)}`,
          permissions: ["time:manage"],
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(customRole);
  // ─── Step 5: Add employee to organization with limited role ───────────────
  const employeeOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: employeeAuth.member.id,
          roleId: customRole.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(employeeOrgMember);
  // ─── Step 6: Create project as owner ──────────────────────────────────────
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // ─── Step 7: Assign owner to project as project-lead ─────────────────────
  const ownerOrgMemberId = organization.owner.id;
  const ownerProjectMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: ownerOrgMemberId,
          projectRole: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(ownerProjectMembership);
  // ─── Step 8: Assign employee to project as member ─────────────────────────
  const employeeProjectMembership =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: employeeOrgMember.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(employeeProjectMembership);
  // ─── Step 9: Employee retrieves own project membership ────────────────────
  const ownMembership = await api.functional.erpHrm.member.projects.members.at(
    employeeConnection,
    {
      projectId: project.id,
      projectMemberId: employeeProjectMembership.id,
    },
  );
  typia.assert(ownMembership);
  TestValidator.equals(
    "employee projectRole is member",
    ownMembership.projectRole,
    "member",
  );
  TestValidator.equals(
    "employee membership deletedAt is null",
    ownMembership.deletedAt,
    null,
  );
  TestValidator.equals(
    "employee org member id matches",
    ownMembership.organizationMember.id,
    employeeOrgMember.id,
  );
  // ─── Step 10: Employee retrieves owner's (project-lead) project membership ─
  const leadMembership = await api.functional.erpHrm.member.projects.members.at(
    employeeConnection,
    {
      projectId: project.id,
      projectMemberId: ownerProjectMembership.id,
    },
  );
  typia.assert(leadMembership);
  TestValidator.equals(
    "owner projectRole is project-lead",
    leadMembership.projectRole,
    "project-lead",
  );
  // ─── Step 11: Non-project-member org member gets 403 ─────────────────────
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdAuth = await authorize_member_join(thirdMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(thirdAuth);
  // Add third member to org but NOT to project
  const thirdOrgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: thirdAuth.member.id,
          roleId: customRole.id,
          employmentType: "part-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(thirdOrgMember);
  // Third member tries to access employee's project membership - should get 403
  await TestValidator.httpError(
    "non-project-member gets 403",
    403,
    async () => {
      await api.functional.erpHrm.member.projects.members.at(
        thirdMemberConnection,
        {
          projectId: project.id,
          projectMemberId: employeeProjectMembership.id,
        },
      );
    },
  );
}
