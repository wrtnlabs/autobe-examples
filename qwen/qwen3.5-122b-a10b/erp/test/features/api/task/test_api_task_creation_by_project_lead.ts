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
 * Test task creation by project lead within an assigned project.
 *
 * Validates that a project lead can successfully create a new task within their assigned project. The test covers the complete workflow from member account creation through task creation, ensuring proper role-based permissions and data relationships.
 *
 * The created task includes required fields (title, priority) with optional fields (description, estimated_hours, due_date). Default status is 'open'. The response includes all relationship objects: project summary, assigned employee (null), parent task (null), empty child tasks array, and empty task histories array.
 *
 * 1. Member account creation and authentication.
 * 2. Organization ID generation for project scope.
 * 3. Project creation within the organization.
 * 4. Project lead assignment to the project.
 * 5. Task creation with required and optional fields.
 * 6. Validation of task structure, relationships, and system-generated fields.
 */
export async function test_api_task_creation_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate organization ID (for simulation mode)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Create a project in the organization
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      memberConnection,
      {
        params: { organizationId },
      },
    );
  typia.assert(project);
  // 4. Assign the member as project-lead to the project
  const projectMember =
    await generate_random_hrm_member_projects_members_create(memberConnection, {
      params: { projectId: project.id },
    });
  typia.assert(projectMember);
  // 5. Create a task as project lead
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      memberConnection,
      {
        params: {
          organizationId,
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 6. Validate task structure and relationships
  TestValidator.equals("task has correct project", task.project.id, project.id);
  TestValidator.predicate("task has title", task.title.length > 0);
  TestValidator.predicate("task has priority", task.priority.length > 0);
  TestValidator.predicate("task status is open", task.status === "open");
  TestValidator.predicate(
    "task has null assigned employee",
    task.assignedEmployee === null,
  );
  TestValidator.predicate(
    "task has null parent task",
    task.parentTask === null,
  );
  TestValidator.equals("task has empty child tasks", task.childTasks.length, 0);
  TestValidator.equals(
    "task has empty histories",
    task.taskHistories.length,
    0,
  );
  TestValidator.predicate("task has created_at", task.created_at.length > 0);
  TestValidator.predicate("task has updated_at", task.updated_at.length > 0);
}
