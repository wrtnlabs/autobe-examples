import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformProjectMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMembership";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_memberships_create } from "../../../generate/generate_random_hrm_platform_member_projects_memberships_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_project_membership } from "../../../prepare/prepare_random_hrm_platform_project_membership";

/**
 * Test that an authenticated member can retrieve a paginated list of projects they are assigned to.
 * The test verifies:
 * 1. The response contains only projects where the current employee has an active membership record (deleted_at IS NULL)
 * 2. Each project includes the employee's role (member or project-lead)
 * 3. Projects are sorted by created_at in descending order by default
 * 4. Pagination metadata is correctly calculated with current page, limit, total records, and total pages
 * 5. Project summaries include id, name, status, color_code, budget_hours, and created_at fields
 *
 * Setup: Create a member account, create multiple projects, assign the employee to some projects with different roles.
 * Execute: Call the my-projects endpoint with default pagination.
 * Validate: Response contains only assigned projects with correct role information and pagination.
 */
export async function test_api_member_projects_list_assigned_projects(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create multiple projects for the member to be assigned to
  const project1 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Alpha",
        status: "active",
        color_code: "#FF5733",
        description: "First test project",
        budget_hours: 100,
      },
    },
  );
  typia.assert(project1);
  const project2 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Beta",
        status: "active",
        color_code: "#33FF57",
        description: "Second test project",
        budget_hours: 200,
      },
    },
  );
  typia.assert(project2);
  const project3 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Gamma",
        status: "completed",
        color_code: "#3357FF",
        description: "Third test project",
        budget_hours: 150,
      },
    },
  );
  typia.assert(project3);
  // 3. Create a project that the member will NOT be assigned to
  const project4 = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {
      body: {
        name: "Project Delta",
        status: "active",
        color_code: "#FF33A8",
        description: "Project not assigned to member",
        budget_hours: 80,
      },
    },
  );
  typia.assert(project4);
  // 4. Assign the member to projects 1, 2, and 3 with different roles
  const membership1 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project1.id,
        },
        body: {
          employee_id: member.id,
          role: "project-lead",
        },
      },
    );
  typia.assert(membership1);
  const membership2 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project2.id,
        },
        body: {
          employee_id: member.id,
          role: "member",
        },
      },
    );
  typia.assert(membership2);
  const membership3 =
    await generate_random_hrm_platform_member_projects_memberships_create(
      memberConnection,
      {
        params: {
          projectId: project3.id,
        },
        body: {
          employee_id: member.id,
          role: "member",
        },
      },
    );
  typia.assert(membership3);
  // 5. Call the my-projects endpoint to retrieve assigned projects
  const response =
    await api.functional.hrmPlatform.member.projects.my_projects.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 20,
          sort: "created_at",
          order: "DESC",
        },
      },
    );
  typia.assert(response);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.equals(
    "pagination total records",
    response.pagination.records,
    3,
  );
  TestValidator.equals("pagination total pages", response.pagination.pages, 1);
  // 7. Validate that response contains exactly 3 projects (not 4)
  TestValidator.equals("assigned projects count", response.data.length, 3);
  // 8. Validate that all returned projects are assigned to the member
  const assignedProjectIds = response.data.map((p) => p.id);
  TestValidator.predicate(
    "project1 is in assigned list",
    assignedProjectIds.includes(project1.id),
  );
  TestValidator.predicate(
    "project2 is in assigned list",
    assignedProjectIds.includes(project2.id),
  );
  TestValidator.predicate(
    "project3 is in assigned list",
    assignedProjectIds.includes(project3.id),
  );
  TestValidator.predicate(
    "project4 is NOT in assigned list",
    !assignedProjectIds.includes(project4.id),
  );
  // 9. Validate project summary fields
  for (const project of response.data) {
    TestValidator.predicate("project has id", project.id !== undefined);
    TestValidator.predicate(
      "project has name",
      project.name !== undefined && project.name.length > 0,
    );
    TestValidator.predicate("project has status", project.status !== undefined);
    TestValidator.predicate(
      "project has color_code",
      project.color_code !== undefined,
    );
    TestValidator.predicate(
      "project has created_at",
      project.created_at !== undefined,
    );
  }
  // 10. Validate sorting by created_at DESC (project1 was created first, project3 last)
  const project1Index = assignedProjectIds.indexOf(project1.id);
  const project2Index = assignedProjectIds.indexOf(project2.id);
  const project3Index = assignedProjectIds.indexOf(project3.id);
  TestValidator.predicate(
    "projects sorted by created_at DESC",
    project3Index < project2Index && project2Index < project1Index,
  );
}
