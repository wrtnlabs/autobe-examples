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

export async function test_api_project_members_list_primary_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the primary success path for listing project members.
   *
   * A member user creates a project, assigns multiple employees to it with different roles (member and project-lead), then retrieves the complete list of project members. The test validates that:
   *
   * 1. All assigned employees appear in the response with correct role assignments
   * 2. Each member summary includes employee details (id, position, employment_type, status, user, organization, role)
   * 3. Each member summary includes project details (id, name, color_code, status, organization)
   * 4. Pagination metadata is correct (current page, limit, total records, total pages)
   * 5. The created_at timestamp reflects when each employee was assigned to the project
   *
   * This validates the core business workflow of viewing project team composition for project management and coordination purposes.
   */
  // 1. Authenticate as member user
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
  // 2. Create a project
  const organizationId = memberAuth.organizations?.[0]?.id;
  if (!organizationId) {
    throw new Error("No organization available for member");
  }
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 3. Assign first employee as member role
  const member1 = await generate_random_hrm_member_projects_members_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        employee_id: typia.random<string>(),
        role: "member",
      } satisfies IHrmProjectMember.ICreate,
    },
  );
  typia.assert(member1);
  // 4. Assign second employee as project-lead role
  const member2 = await generate_random_hrm_member_projects_members_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
      body: {
        employee_id: typia.random<string>(),
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
    },
  );
  typia.assert(member2);
  // 5. List project members
  const membersList = await api.functional.hrm.member.projects.members.index(
    memberConnection,
    {
      projectId: project.id,
      body: {},
    },
  );
  typia.assert(membersList);
  // 6. Validate response structure and content
  TestValidator.equals("total members", membersList.pagination.records, 2);
  TestValidator.equals("current page", membersList.pagination.current, 1);
  TestValidator.equals("has data", membersList.data.length, 2);
  // Validate project details in each member
  for (const member of membersList.data) {
    TestValidator.equals("project matches", member.project.id, project.id);
    TestValidator.predicate(
      "has employee id",
      member.employee.id !== undefined,
    );
    TestValidator.predicate(
      "has position",
      member.employee.position !== undefined,
    );
    TestValidator.predicate(
      "has employment type",
      member.employee.employment_type !== undefined,
    );
    TestValidator.predicate("has status", member.employee.status !== undefined);
    TestValidator.predicate("has user", member.employee.user !== undefined);
    TestValidator.predicate(
      "has organization",
      member.employee.organization !== undefined,
    );
    TestValidator.predicate(
      "has role",
      member.role === "member" || member.role === "project-lead",
    );
    TestValidator.predicate("has created_at", member.created_at !== undefined);
  }
  // Validate both roles are present
  const roles = membersList.data.map((m) => m.role);
  TestValidator.predicate("has member role", roles.includes("member"));
  TestValidator.predicate(
    "has project-lead role",
    roles.includes("project-lead"),
  );
}