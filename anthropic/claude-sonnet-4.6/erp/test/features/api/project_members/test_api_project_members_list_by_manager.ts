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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProjectMember";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";
import { prepare_random_erp_hrm_organization_member } from "../../../prepare/prepare_random_erp_hrm_organization_member";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

export async function test_api_project_members_list_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Register manager (becomes org owner with project:manage permission)
  // ──────────────────────────────────────────────────────────────────────────
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // ──────────────────────────────────────────────────────────────────────────
  // 2. Create organization
  // ──────────────────────────────────────────────────────────────────────────
  const org = await generate_random_erp_hrm_member_organizations_create(
    managerConnection,
    {},
  );
  typia.assert(org);
  // ──────────────────────────────────────────────────────────────────────────
  // 3. Create project
  // ──────────────────────────────────────────────────────────────────────────
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // ──────────────────────────────────────────────────────────────────────────
  // 4. Register second member (employee1)
  // ──────────────────────────────────────────────────────────────────────────
  const employee1Connection: api.IConnection = { host: connection.host };
  const employee1Authorized = await authorize_member_join(
    employee1Connection,
    {},
  );
  typia.assert(employee1Authorized);
  // ──────────────────────────────────────────────────────────────────────────
  // 5. Add employee1 to the organization
  // ──────────────────────────────────────────────────────────────────────────
  const orgMember1 =
    await generate_random_erp_hrm_member_organizations_members_create(
      managerConnection,
      {
        body: {
          memberId: employee1Authorized.id,
        },
        params: {
          organizationId: org.id,
        },
      },
    );
  typia.assert(orgMember1);
  // ──────────────────────────────────────────────────────────────────────────
  // 6. Assign employee1 to the project as "member"
  // ──────────────────────────────────────────────────────────────────────────
  const projectMember1 =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          organizationMemberId: orgMember1.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember1);
  // ──────────────────────────────────────────────────────────────────────────
  // 7. Register third member (employee2)
  // ──────────────────────────────────────────────────────────────────────────
  const employee2Connection: api.IConnection = { host: connection.host };
  const employee2Authorized = await authorize_member_join(
    employee2Connection,
    {},
  );
  typia.assert(employee2Authorized);
  // ──────────────────────────────────────────────────────────────────────────
  // 8. Add employee2 to the organization
  // ──────────────────────────────────────────────────────────────────────────
  const orgMember2 =
    await generate_random_erp_hrm_member_organizations_members_create(
      managerConnection,
      {
        body: {
          memberId: employee2Authorized.id,
        },
        params: {
          organizationId: org.id,
        },
      },
    );
  typia.assert(orgMember2);
  // ──────────────────────────────────────────────────────────────────────────
  // 9. Assign employee2 to the project as "project-lead"
  // ──────────────────────────────────────────────────────────────────────────
  const projectMember2 =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          organizationMemberId: orgMember2.id,
          projectRole: "project-lead",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember2);
  // ──────────────────────────────────────────────────────────────────────────
  // 10. List all project members (no filter) — manager view
  // ──────────────────────────────────────────────────────────────────────────
  const allMembers = await api.functional.erpHrm.member.projects.members.index(
    managerConnection,
    {
      projectId: project.id,
      body: {} satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(allMembers);
  // Verify at least 2 members are present
  TestValidator.predicate(
    "records should be at least 2",
    allMembers.pagination.records >= 2,
  );
  // Verify both assigned members appear in results with correct roles
  const memberOrgMemberId = orgMember1.id;
  const leadOrgMemberId = orgMember2.id;
  const foundMember = allMembers.data.find(
    (d) => d.organizationMember.id === memberOrgMemberId,
  );
  const foundLead = allMembers.data.find(
    (d) => d.organizationMember.id === leadOrgMemberId,
  );
  TestValidator.predicate(
    "employee1 (member role) should appear in list",
    foundMember !== undefined,
  );
  TestValidator.predicate(
    "employee2 (project-lead role) should appear in list",
    foundLead !== undefined,
  );
  if (foundMember !== undefined) {
    TestValidator.equals(
      "employee1 projectRole should be member",
      foundMember.projectRole,
      "member",
    );
  }
  if (foundLead !== undefined) {
    TestValidator.equals(
      "employee2 projectRole should be project-lead",
      foundLead.projectRole,
      "project-lead",
    );
  }
  // ──────────────────────────────────────────────────────────────────────────
  // 11. Filter by projectRole: "project-lead"
  // ──────────────────────────────────────────────────────────────────────────
  const filteredByLead =
    await api.functional.erpHrm.member.projects.members.index(
      managerConnection,
      {
        projectId: project.id,
        body: {
          projectRole: "project-lead",
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(filteredByLead);
  TestValidator.equals(
    "filtered records should be 1 (only project-lead)",
    filteredByLead.pagination.records,
    1,
  );
  TestValidator.predicate(
    "filtered data should contain exactly 1 item",
    filteredByLead.data.length === 1,
  );
  if (filteredByLead.data.length > 0) {
    TestValidator.equals(
      "filtered item projectRole should be project-lead",
      filteredByLead.data[0]!.projectRole,
      "project-lead",
    );
  }
  // ──────────────────────────────────────────────────────────────────────────
  // 12. Pagination: page=1, limit=1
  // ──────────────────────────────────────────────────────────────────────────
  const paginated = await api.functional.erpHrm.member.projects.members.index(
    managerConnection,
    {
      projectId: project.id,
      body: {
        page: 1,
        limit: 1,
      } satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.predicate(
    "paginated data should contain exactly 1 item",
    paginated.data.length === 1,
  );
  TestValidator.predicate(
    "pagination.pages should be at least 2",
    paginated.pagination.pages >= 2,
  );
  TestValidator.equals(
    "pagination.limit should be 1",
    paginated.pagination.limit,
    1,
  );
  TestValidator.equals(
    "pagination.current should be 1",
    paginated.pagination.current,
    1,
  );
}
