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

export async function test_api_project_members_list_by_project_member(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Manager joins and gets an authenticated connection ──────────────────
  const managerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(managerConnection, {});
  // ── 2. Manager creates an organization ────────────────────────────────────
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      managerConnection,
      {},
    );
  typia.assert(organization);
  // ── 3. Manager creates a project ──────────────────────────────────────────
  const project = await generate_random_erp_hrm_member_projects_create(
    managerConnection,
    {},
  );
  typia.assert(project);
  // ── 4. Employee joins the platform ────────────────────────────────────────
  const employeeConnection: api.IConnection = { host: connection.host };
  const employeeAuth = await authorize_member_join(employeeConnection, {});
  // ── 5. Manager adds the employee to the organization ─────────────────────
  const orgMember =
    await generate_random_erp_hrm_member_organizations_members_create(
      managerConnection,
      {
        body: {
          memberId: employeeAuth.id,
          employmentType: "full-time",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(orgMember);
  // ── 6. Manager assigns the employee to the project as `member` ──────────
  const projectMember =
    await generate_random_erp_hrm_member_projects_members_create(
      managerConnection,
      {
        body: {
          organizationMemberId: orgMember.id,
          projectRole: "member",
        },
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // ── 7. Employee lists the project members (no project:manage permission) ──
  const listResult = await api.functional.erpHrm.member.projects.members.index(
    employeeConnection,
    {
      projectId: project.id,
      body: {} satisfies IErpHrmProjectMember.IRequest,
    },
  );
  typia.assert(listResult);
  // Verify the employee's membership appears in the list
  const employeeRecord = listResult.data.find(
    (record) => record.organizationMember.id === orgMember.id,
  );
  TestValidator.predicate(
    "employee membership appears in project member list",
    employeeRecord !== undefined,
  );
  // Verify all returned records have active organizationMember status
  for (const record of listResult.data) {
    TestValidator.equals(
      "organizationMember status is active",
      record.organizationMember.status,
      "active",
    );
  }
  // ── 8. Filter by organizationMemberId ────────────────────────────────────
  const filteredResult =
    await api.functional.erpHrm.member.projects.members.index(
      employeeConnection,
      {
        projectId: project.id,
        body: {
          organizationMemberId: orgMember.id,
        } satisfies IErpHrmProjectMember.IRequest,
      },
    );
  typia.assert(filteredResult);
  // Verify pagination.records === 1
  TestValidator.equals(
    "filtered result has exactly 1 record",
    filteredResult.pagination.records,
    1,
  );
  // Verify the single record's projectRole is "member"
  TestValidator.predicate(
    "filtered result has at least one data item",
    filteredResult.data.length > 0,
  );
  TestValidator.equals(
    "employee projectRole is member",
    filteredResult.data[0]!.projectRole,
    "member",
  );
}
