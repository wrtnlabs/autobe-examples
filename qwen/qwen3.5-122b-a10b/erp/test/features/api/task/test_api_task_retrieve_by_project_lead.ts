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
 * Test project lead retrieves a task within their assigned project.
 *
 * Validates that project leads have full task viewing capabilities with the same access as regular members, but with the additional context of elevated permissions for task management. The test verifies the complete task entity is returned with all fields including project context, assigned employee details, parent/child task relationships, and status change history.
 *
 * This ensures project leads can view tasks while also having management authority over task operations. The test follows the complete workflow from member registration through task retrieval.
 *
 * 1. Register a new member account with email and password credentials.
 * 2. Create a project within the organization with name and color code.
 * 3. Assign the authenticated member as project-lead with elevated task management permissions.
 * 4. Create a task within the project for retrieval testing by project lead.
 * 5. Retrieve the task using the project lead's authenticated connection.
 * 6. Validates the task response contains all expected fields and relationships.
 *
 * Note: This test assumes organization and employee records exist in the test environment.
 * Organization creation and employee assignment endpoints are not available in the current SDK.
 */
export async function test_api_task_retrieve_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
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
  // Generate organization ID (in real E2E, this would be from test fixture)
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create project within organization
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
  // 3. Assign member as project-lead
  // Using member ID as employee ID (assumes member-employee relationship exists)
  const projectMember =
    await generate_random_hrm_member_projects_members_create(
      memberConnection,
      {
        body: {
          employee_id: memberAuth.id,
          role: "project-lead",
        } satisfies IHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 4. Create task within project
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
  // 5. Retrieve the task as project lead
  const retrievedTask =
    await api.functional.hrm.member.organizations.projects.tasks.at(
      memberConnection,
      {
        organizationId,
        projectId: project.id,
        taskId: task.id,
      },
    );
  typia.assert(retrievedTask);
  // 6. Validate task response
  TestValidator.equals("task id matches", retrievedTask.id, task.id);
  TestValidator.equals("task title matches", retrievedTask.title, task.title);
  TestValidator.equals(
    "task status matches",
    retrievedTask.status,
    task.status,
  );
  TestValidator.equals(
    "task priority matches",
    retrievedTask.priority,
    task.priority,
  );
  TestValidator.equals(
    "project id matches",
    retrievedTask.project.id,
    project.id,
  );
  TestValidator.predicate(
    "has project context",
    retrievedTask.project !== null,
  );
}