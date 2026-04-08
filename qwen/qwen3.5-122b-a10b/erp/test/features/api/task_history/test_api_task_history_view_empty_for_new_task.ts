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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTaskHistory";
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
 * Test viewing task history for a newly created task with no status changes.
 *
 * Validates that when a project lead creates a task without modifying its status afterward, the task history endpoint returns an empty data array with correct pagination metadata. This edge case test ensures the system handles tasks with no audit trail gracefully.
 *
 * The test follows a complete workflow: member authentication, project creation, project member assignment as project-lead, task creation, and history verification.
 *
 * 1. Member joins the system with email and password credentials.
 * 2. Project is created within an organization.
 * 3. Member is assigned to the project as project-lead.
 * 4. Project lead creates a task without any status modifications.
 * 5. Task history endpoint is called and validated for empty results.
 * 6. Pagination metadata is verified (records: 0, pages: 0).
 */
export async function test_api_task_history_view_empty_for_new_task(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmMember.IAuthorized =
    await api.functional.hrm.auth.member.join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create project
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const project = await api.functional.hrm.member.organizations.projects.create(
    memberConnection,
    {
      organizationId,
      body: {
        name: RandomGenerator.name(),
        color_code: "#FF5733",
        status: "active",
      } satisfies IHrmProject.ICreate,
    },
  );
  typia.assert(project);
  // 3. Assign member to project as project-lead
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const projectMember = await api.functional.hrm.member.projects.members.create(
    memberConnection,
    {
      projectId: project.id,
      body: {
        employee_id: employeeId,
        role: "project-lead",
      } satisfies IHrmProjectMember.ICreate,
    },
  );
  typia.assert(projectMember);
  // 4. Create task without status modifications
  const task =
    await api.functional.hrm.member.organizations.projects.tasks.create(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        body: {
          title: RandomGenerator.name(),
          priority: "medium",
          status: "open",
        } satisfies IHrmTask.ICreate,
      },
    );
  typia.assert(task);
  // 5. View task history - should be empty
  const history: IPageIHrmTaskHistory.ISummary =
    await api.functional.hrm.member.organizations.projects.tasks.history.at(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
      },
    );
  typia.assert(history);
  // 6. Validate empty history with correct pagination
  TestValidator.equals("history data is empty", history.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    history.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is 0", history.pagination.pages, 0);
}
