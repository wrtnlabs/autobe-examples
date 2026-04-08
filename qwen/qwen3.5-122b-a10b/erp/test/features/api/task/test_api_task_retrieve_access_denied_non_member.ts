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
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_member_organizations_projects_create } from "../../../generate/generate_random_hrm_member_organizations_projects_create";
import { generate_random_hrm_member_organizations_projects_tasks_create } from "../../../generate/generate_random_hrm_member_organizations_projects_tasks_create";
import { generate_random_hrm_member_projects_members_create } from "../../../generate/generate_random_hrm_member_projects_members_create";
import { prepare_random_hrm_project } from "../../../prepare/prepare_random_hrm_project";
import { prepare_random_hrm_project_member } from "../../../prepare/prepare_random_hrm_project_member";
import { prepare_random_hrm_task } from "../../../prepare/prepare_random_hrm_task";

/**
 * Test task retrieval access denied for non-project member.
 *
 * Validates that employees who are not members of a project cannot access task details within that project. This test ensures proper access control enforcement and data isolation between projects, verifying that the system correctly rejects unauthorized access attempts with appropriate error responses.
 *
 * The test follows a complete workflow: creating two members, establishing a project with one member as a participant, creating a task, then attempting to access that task with the non-member. The access denial validates Section 126 requirement that task lists and details are only accessible to project members.
 *
 * 1. First member registers and authenticates
 * 2. First member creates a project within an organization
 * 3. First member is assigned as project member (via employee record)
 * 4. First member creates a task in the project
 * 5. Second member registers in the same organization
 * 6. Second member attempts to retrieve the task (not a project member)
 * 7. Validates access denied response (HTTP 403 or 404)
 */
export async function test_api_task_retrieve_access_denied_non_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member registers
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember: IHrmMember.IAuthorized = await authorize_member_join(
    firstMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(firstMember);
  // Generate organization and project IDs
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const projectId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. First member creates a project
  const project: IHrmProject =
    await api.functional.hrm.member.organizations.projects.create(
      firstMemberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(3),
          color_code: "#FF5733",
          status: "active",
        } satisfies IHrmProject.ICreate,
      },
    );
  typia.assert(project);
  // 3. Create a task in the project (first member has access as project creator)
  const taskId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const task: IHrmTask =
    await api.functional.hrm.member.organizations.projects.tasks.create(
      firstMemberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          title: RandomGenerator.name(2),
          priority: "medium",
        } satisfies IHrmTask.ICreate,
      },
    );
  typia.assert(task);
  // 4. Second member registers (same organization context)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember: IHrmMember.IAuthorized = await authorize_member_join(
    secondMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(secondMember);
  // 5. Second member attempts to retrieve the task (NOT a project member)
  // This should fail with access denied (403 or 404)
  await TestValidator.httpError(
    "non-project member cannot access task",
    [403, 404],
    async () => {
      await api.functional.hrm.member.organizations.projects.tasks.at(
        secondMemberConnection,
        {
          organizationId,
          projectId: project.id,
          taskId: task.id,
        },
      );
    },
  );
}
