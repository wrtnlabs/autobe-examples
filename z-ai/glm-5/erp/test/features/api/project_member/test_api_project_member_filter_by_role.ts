import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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
import { generate_random_erp_hrm_member_projects_create } from "../../../generate/generate_random_erp_hrm_member_projects_create";
import { generate_random_erp_hrm_member_projects_members_create } from "../../../generate/generate_random_erp_hrm_member_projects_members_create";
import { prepare_random_erp_hrm_project } from "../../../prepare/prepare_random_erp_hrm_project";
import { prepare_random_erp_hrm_project_member } from "../../../prepare/prepare_random_erp_hrm_project_member";

/**
 * Test role-based filtering when listing project members.
 *
 * This test validates that the project members list endpoint correctly
 * filters members by their project role ('member' vs 'project_lead').
 *
 * Flow:
 * 1. Create an organization owner (has project:manage permission)
 * 2. Create a project
 * 3. Assign members with 'project_lead' role
 * 4. Assign members with 'member' role
 * 5. Test filtering by 'project_lead' role
 * 6. Test filtering by 'member' role
 * 7. Test listing without role filter
 */
export async function test_api_project_member_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create organization owner with project:manage permission
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create a project
  const project = await generate_random_erp_hrm_member_projects_create(
    ownerConnection,
    {},
  );
  typia.assert(project);
  // Step 3: Create project members with 'project_lead' role
  const PROJECT_LEAD_COUNT = 3;
  const projectLeads = await ArrayUtil.asyncRepeat(PROJECT_LEAD_COUNT, () =>
    generate_random_erp_hrm_member_projects_members_create(ownerConnection, {
      params: { projectId: project.id },
      body: {
        role: "project_lead",
      } satisfies Partial<IErpHrmProjectMember.ICreate>,
    }),
  );
  projectLeads.forEach((pm) => typia.assert(pm));
  // Step 4: Create project members with 'member' role
  const REGULAR_MEMBER_COUNT = 3;
  const regularMembers = await ArrayUtil.asyncRepeat(REGULAR_MEMBER_COUNT, () =>
    generate_random_erp_hrm_member_projects_members_create(ownerConnection, {
      params: { projectId: project.id },
      body: { role: "member" } satisfies Partial<IErpHrmProjectMember.ICreate>,
    }),
  );
  regularMembers.forEach((pm) => typia.assert(pm));
  // Step 5: Test filtering by 'project_lead' role
  const projectLeadResult =
    await api.functional.erpHrm.member.projects.members.index(ownerConnection, {
      projectId: project.id,
      body: { role: "project_lead" } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(projectLeadResult);
  // Validation: Only project leads should be returned
  TestValidator.predicate(
    "project_lead filter returns only project leads",
    projectLeadResult.data.every((member) => member.role === "project_lead"),
  );
  // Validation: No 'member' role entries should appear
  TestValidator.predicate(
    "project_lead filter excludes regular members",
    projectLeadResult.data.every((member) => member.role !== "member"),
  );
  // Validation: Count should match created project leads
  TestValidator.equals(
    "project_lead count matches created leads",
    projectLeadResult.pagination.records,
    PROJECT_LEAD_COUNT,
  );
  // Step 6: Test filtering by 'member' role
  const memberResult =
    await api.functional.erpHrm.member.projects.members.index(ownerConnection, {
      projectId: project.id,
      body: { role: "member" } satisfies IErpHrmProjectMember.IRequest,
    });
  typia.assert(memberResult);
  // Validation: Only regular members should be returned
  TestValidator.predicate(
    "member filter returns only regular members",
    memberResult.data.every((member) => member.role === "member"),
  );
  // Validation: No 'project_lead' role entries should appear
  TestValidator.predicate(
    "member filter excludes project leads",
    memberResult.data.every((member) => member.role !== "project_lead"),
  );
  // Validation: Count should match created regular members
  TestValidator.equals(
    "member count matches created members",
    memberResult.pagination.records,
    REGULAR_MEMBER_COUNT,
  );
  // Step 7: Test listing without role filter
  const allMembersResult =
    await api.functional.erpHrm.member.projects.members.index(ownerConnection, {
      projectId: project.id,
      body: {},
    });
  typia.assert(allMembersResult);
  // Validation: All members should be returned
  TestValidator.equals(
    "unfiltered list returns all members",
    allMembersResult.pagination.records,
    PROJECT_LEAD_COUNT + REGULAR_MEMBER_COUNT,
  );
  // Validation: Response contains both roles
  const projectLeadCountInResult = allMembersResult.data.filter(
    (m) => m.role === "project_lead",
  ).length;
  const regularMemberCountInResult = allMembersResult.data.filter(
    (m) => m.role === "member",
  ).length;
  TestValidator.equals(
    "unfiltered list contains correct number of project leads",
    projectLeadCountInResult,
    PROJECT_LEAD_COUNT,
  );
  TestValidator.equals(
    "unfiltered list contains correct number of regular members",
    regularMemberCountInResult,
    REGULAR_MEMBER_COUNT,
  );
}
