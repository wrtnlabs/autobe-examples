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

export async function test_api_project_assignments_list_filtered_by_project_and_role(
  connection: api.IConnection,
): Promise<void> {
  // ─── Step 1: Register member 1 (owner) ───────────────────────────────────
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // ─── Step 2: Create organization ─────────────────────────────────────────
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // ─── Step 3: Register member 2 ───────────────────────────────────────────
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  typia.assert(member2Auth);
  // ─── Step 4: Add member 2 to organization ────────────────────────────────
  const orgMember2 =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: member2Auth.id,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember2);
  // ─── Step 5: Register member 3 ───────────────────────────────────────────
  const member3Connection: api.IConnection = { host: connection.host };
  const member3Auth = await authorize_member_join(member3Connection, {});
  typia.assert(member3Auth);
  // ─── Step 6: Add member 3 to organization ────────────────────────────────
  const orgMember3 =
    await generate_random_erp_hrm_member_organizations_members_create(
      ownerConnection,
      {
        body: {
          memberId: member3Auth.id,
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember3);
  // ─── Step 7: Create Project A ─────────────────────────────────────────────
  const projectA = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(projectA);
  // ─── Step 8: Create Project B ─────────────────────────────────────────────
  const projectB = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(projectB);
  // ─── Step 9: Assign member 2 to Project A as 'member' ────────────────────
  const assignMember2ProjectA =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: orgMember2.id,
          projectRole: "member",
        },
        params: {
          projectId: projectA.id,
        },
      },
    );
  typia.assert(assignMember2ProjectA);
  // ─── Step 10: Assign member 3 to Project A as 'project-lead' ─────────────
  const assignMember3ProjectA =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: orgMember3.id,
          projectRole: "project-lead",
        },
        params: {
          projectId: projectA.id,
        },
      },
    );
  typia.assert(assignMember3ProjectA);
  // ─── Step 11: Assign member 2 to Project B as 'project-lead' ─────────────
  const assignMember2ProjectB =
    await generate_random_erp_hrm_member_projects_members_create(
      ownerConnection,
      {
        body: {
          organizationMemberId: orgMember2.id,
          projectRole: "project-lead",
        },
        params: {
          projectId: projectB.id,
        },
      },
    );
  typia.assert(assignMember2ProjectB);
  // ─── Test 1: Filter by projectId (Project A) ──────────────────────────────
  const filterByProjectA =
    await api.functional.erpHrm.member.projectAssignments.index(
      ownerConnection,
      {
        body: {
          projectId: projectA.id,
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(filterByProjectA);
  TestValidator.predicate(
    "filter by project A returns 2 records",
    filterByProjectA.pagination.records === 2,
  );
  TestValidator.predicate(
    "all records belong to Project A",
    filterByProjectA.data.every((r) => r.project.id === projectA.id),
  );
  TestValidator.predicate(
    "no records from Project B in Project A filter",
    filterByProjectA.data.every((r) => r.project.id !== projectB.id),
  );
  // ─── Test 2: Filter by projectRole 'project-lead' ─────────────────────────
  const filterByProjectLead =
    await api.functional.erpHrm.member.projectAssignments.index(
      ownerConnection,
      {
        body: {
          projectRole: "project-lead",
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(filterByProjectLead);
  TestValidator.predicate(
    "all project-lead records have correct role",
    filterByProjectLead.data.every((r) => r.projectRole === "project-lead"),
  );
  TestValidator.predicate(
    "no 'member' role records in project-lead filter",
    filterByProjectLead.data.every((r) => r.projectRole !== "member"),
  );
  // ─── Test 3: Combined filter (projectId=A + projectRole='project-lead') ───
  const filterCombined =
    await api.functional.erpHrm.member.projectAssignments.index(
      ownerConnection,
      {
        body: {
          projectId: projectA.id,
          projectRole: "project-lead",
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(filterCombined);
  TestValidator.predicate(
    "combined filter returns exactly 1 record",
    filterCombined.pagination.records === 1,
  );
  TestValidator.predicate(
    "combined filter record is member 3 as project-lead on Project A",
    filterCombined.data.length === 1 &&
      filterCombined.data[0]!.organizationMember.id === orgMember3.id &&
      filterCombined.data[0]!.projectRole === "project-lead" &&
      filterCombined.data[0]!.project.id === projectA.id,
  );
  // ─── Test 4: Filter by organizationMemberId (member 2) ────────────────────
  const filterByMember2 =
    await api.functional.erpHrm.member.projectAssignments.index(
      ownerConnection,
      {
        body: {
          organizationMemberId: orgMember2.id,
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(filterByMember2);
  TestValidator.predicate(
    "filter by member 2 returns 2 records",
    filterByMember2.pagination.records === 2,
  );
  TestValidator.predicate(
    "all records for member 2 have correct organizationMember id",
    filterByMember2.data.every(
      (r) => r.organizationMember.id === orgMember2.id,
    ),
  );
  TestValidator.predicate(
    "no records for member 3 in member 2 filter",
    filterByMember2.data.every(
      (r) => r.organizationMember.id !== orgMember3.id,
    ),
  );
  // ─── Test 5: Empty filter — use a random UUID with no assignments ──────────
  const nonExistentProjectId = typia.random<string & tags.Format<"uuid">>();
  const filterEmpty =
    await api.functional.erpHrm.member.projectAssignments.index(
      ownerConnection,
      {
        body: {
          projectId: nonExistentProjectId,
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(filterEmpty);
  TestValidator.predicate(
    "empty filter returns no records",
    filterEmpty.data.length === 0,
  );
  TestValidator.predicate(
    "empty filter pagination.records is 0",
    filterEmpty.pagination.records === 0,
  );
}
