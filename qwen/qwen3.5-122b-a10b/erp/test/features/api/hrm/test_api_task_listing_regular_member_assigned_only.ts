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
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTask";
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

export async function test_api_task_listing_regular_member_assigned_only(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test access control for regular project members viewing task listings.
   *
   * Validates that regular project members can access the project tasks endpoint without permission errors, while the server-side filtering ensures they only see tasks assigned to them. This test focuses on the permission structure and endpoint accessibility rather than task creation and filtering logic.
   *
   * The test creates two members with different project roles (project-lead and regular member), assigns them to a project, and verifies that the regular member can successfully list tasks without receiving a 403 Forbidden error. Server-side filtering is expected to return only tasks assigned to the regular member, though actual task creation is not possible with available SDK functions.
   *
   * 1. Create project-lead member account and authenticate.
   * 2. Create regular member account and authenticate.
   * 3. Create a project in the organization.
   * 4. Assign project-lead to project with project-lead role.
   * 5. Assign regular member to project with member role.
   * 6. Regular member lists tasks - validates no 403 error.
   * 7. Validates that the response structure is correct.
   */
  // 1. Create project-lead member
  const projectLeadConnection: api.IConnection = { host: connection.host };
  const projectLeadAuth = await authorize_member_join(projectLeadConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(projectLeadAuth);
  // 2. Create regular member
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMemberAuth = await authorize_member_join(
    regularMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    },
  );
  typia.assert(regularMemberAuth);
  // 3. Create organization context (using first organization from login)
  // Note: In real flow, organization would be created during member setup
  // For this test, we use a generated UUID as organization context
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create project as project-lead
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      projectLeadConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 5. Assign project-lead to project
  const projectLeadMember =
    await generate_random_hrm_member_projects_members_create(
      projectLeadConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: projectLeadAuth.id,
          role: "project-lead",
        } satisfies IHrmProjectMember.ICreate,
      },
    );
  typia.assert(projectLeadMember);
  // 6. Assign regular member to project
  const regularMemberProjectMember =
    await generate_random_hrm_member_projects_members_create(
      projectLeadConnection,
      {
        params: { projectId: project.id },
        body: {
          employee_id: regularMemberAuth.id,
          role: "member",
        } satisfies IHrmProjectMember.ICreate,
      },
    );
  typia.assert(regularMemberProjectMember);
  // 7. Regular member lists tasks - should NOT return 403 Forbidden
  // This validates that regular members have project access
  const regularMemberTasks =
    await api.functional.hrm.member.organizations.projects.tasks.index(
      regularMemberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {},
      },
    );
  typia.assert(regularMemberTasks);
  // 8. Validate response structure
  TestValidator.predicate(
    "task listing response has pagination",
    regularMemberTasks.pagination !== undefined,
  );
  TestValidator.predicate(
    "task listing response has data array",
    Array.isArray(regularMemberTasks.data),
  );
  TestValidator.predicate(
    "regular member can access project tasks endpoint",
    regularMemberTasks.pagination.current >= 0,
  );
  // 9. Document expected behavior (server-side filtering):
  // Regular members should only see tasks assigned to them
  // This filtering happens on the server and cannot be fully tested
  // without task creation capabilities
  // Expected: regularMemberTasks.data should contain only tasks where
  // assignedEmployee.id === regularMemberAuth.id
}
