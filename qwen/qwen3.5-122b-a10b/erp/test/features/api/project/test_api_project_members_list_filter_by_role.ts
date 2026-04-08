import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";

export async function test_api_project_members_list_filter_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member user registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization and get organization ID from memberAuth.organizations
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("Organization not found in member auth response");
  }
  // 3. Create a project within the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 4. Assign employees to the project with different roles using utility function
  // Employee 1: member role
  const member1 = await generate_random_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { role: "member" } satisfies Partial<IHrmProjectMember.ICreate>,
    },
  );
  typia.assert(member1);
  TestValidator.equals("first member has member role", member1.role, "member");
  // Employee 2: member role
  const member2 = await generate_random_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: { role: "member" } satisfies Partial<IHrmProjectMember.ICreate>,
    },
  );
  typia.assert(member2);
  TestValidator.equals("second member has member role", member2.role, "member");
  // Employee 3: project-lead role
  const lead = await generate_random_hrm_member_projects_members_create(
    memberConnection,
    {
      params: { projectId: project.id },
      body: {
        role: "project-lead",
      } satisfies Partial<IHrmProjectMember.ICreate>,
    },
  );
  typia.assert(lead);
  TestValidator.equals("lead has project-lead role", lead.role, "project-lead");
  // 5. Filter by role='member' and validate
  const membersFilter = await api.functional.hrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: { role: "member" } satisfies IHrmProjectMember.IRequest,
    },
  );
  typia.assert(membersFilter);
  TestValidator.equals(
    "filtered count matches members only",
    membersFilter.pagination.records,
    2,
  );
  TestValidator.predicate(
    "all filtered members have member role",
    membersFilter.data.every((m) => m.role === "member"),
  );
  // 6. Filter by role='project-lead' and validate
  const leadsFilter = await api.functional.hrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: { role: "project-lead" } satisfies IHrmProjectMember.IRequest,
    },
  );
  typia.assert(leadsFilter);
  TestValidator.equals(
    "filtered count matches leads only",
    leadsFilter.pagination.records,
    1,
  );
  TestValidator.predicate(
    "all filtered leads have project-lead role",
    leadsFilter.data.every((m) => m.role === "project-lead"),
  );
  // 7. Verify pagination metadata reflects filtered count
  TestValidator.equals(
    "member filter pages count correct",
    membersFilter.pagination.pages,
    membersFilter.pagination.records > 0 ? 1 : 0,
  );
  TestValidator.equals(
    "lead filter pages count correct",
    leadsFilter.pagination.pages,
    leadsFilter.pagination.records > 0 ? 1 : 0,
  );
  // 8. Verify employee and project details are included in summaries
  TestValidator.predicate(
    "member has employee details",
    membersFilter.data[0]?.employee !== undefined,
  );
  TestValidator.predicate(
    "member has project details",
    membersFilter.data[0]?.project !== undefined,
  );
  TestValidator.equals(
    "project matches original",
    membersFilter.data[0]?.project.id,
    project.id,
  );
  // 9. Verify total count without filter includes all members
  const allMembers = await api.functional.hrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: {} satisfies IHrmProjectMember.IRequest,
    },
  );
  typia.assert(allMembers);
  TestValidator.equals(
    "total count matches all assignments",
    allMembers.pagination.records,
    3,
  );
}
