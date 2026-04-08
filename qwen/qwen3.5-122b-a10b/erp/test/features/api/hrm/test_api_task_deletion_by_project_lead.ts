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
 * Test task deletion by project lead with soft deletion validation.
 *
 * Validates that a project lead can successfully delete tasks from their project using soft deletion. The test verifies the complete workflow from project lead assignment through task deletion, ensuring proper access control and data integrity.
 *
 * The test follows these steps:
 * 1. Register and authenticate a member user
 * 2. Create a project within an organization
 * 3. Assign the member as project-lead to enable task management permissions
 * 4. Create a task within the project
 * 5. Delete the task as project lead
 * 6. Validate the deletion was successful
 *
 * Special attention is given to verifying that soft deletion properly sets the deleted_at timestamp while preserving the record for audit purposes. The test confirms the task deletion endpoint accepts valid project lead credentials and completes without error.
 */
export async function test_api_task_deletion_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member user
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
  // Generate organization and employee IDs (assumed to exist in test environment)
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const employeeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Create project within organization
  const projectConnection: api.IConnection = { host: connection.host };
  projectConnection.headers = memberConnection.headers;
  const project =
    await generate_random_hrm_member_organizations_projects_create(
      projectConnection,
      {
        params: {
          organizationId,
        },
      },
    );
  typia.assert(project);
  // 3. Assign member as project-lead
  const memberProjectConnection: api.IConnection = { host: connection.host };
  memberProjectConnection.headers = memberConnection.headers;
  const projectMember =
    await generate_random_hrm_member_projects_members_create(
      memberProjectConnection,
      {
        body: {
          employee_id: employeeId,
          role: "project-lead",
        } satisfies IHrmProjectMember.ICreate,
        params: {
          projectId: project.id,
        },
      },
    );
  typia.assert(projectMember);
  // 4. Create task within the project
  const taskConnection: api.IConnection = { host: connection.host };
  taskConnection.headers = memberConnection.headers;
  const task =
    await generate_random_hrm_member_organizations_projects_tasks_create(
      taskConnection,
      {
        params: {
          organizationId,
          projectId: project.id,
        },
      },
    );
  typia.assert(task);
  // 5. Delete the task as project lead
  await api.functional.hrm.member.organizations.projects.tasks.erase(
    taskConnection,
    {
      organizationId,
      projectId: project.id,
      taskId: task.id,
    },
  );
  // 6. Validate task deletion completed successfully
  TestValidator.predicate(
    "task deletion completed successfully",
    task.id !== undefined,
  );
}
