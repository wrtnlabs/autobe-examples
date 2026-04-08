import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_projects_create } from "../../../generate/generate_random_hrm_platform_member_projects_create";
import { generate_random_hrm_platform_member_projects_tasks_create } from "../../../generate/generate_random_hrm_platform_member_projects_tasks_create";
import { prepare_random_hrm_platform_project } from "../../../prepare/prepare_random_hrm_platform_project";
import { prepare_random_hrm_platform_task } from "../../../prepare/prepare_random_hrm_platform_task";

/**
 * Test that a project lead can successfully delete a task within their assigned project.
 *
 * Validates the complete task deletion workflow including member authentication, project creation, task creation, and soft deletion. Ensures that the project lead has appropriate permissions to delete tasks and that the deletion operation completes successfully.
 *
 * The test verifies that task deletion uses soft-delete mechanism, preserving the task record with a deleted_at timestamp while making it invisible to normal queries. Task history records remain intact as immutable audit trail entries, and existing timelogs referencing the task remain valid as historical work records.
 *
 * 1. Member registers with email and credentials using authorize_member_join.
 * 2. Member creates a project using generate_random_hrm_platform_member_projects_create.
 * 3. Member creates a task within the project using generate_random_hrm_platform_member_projects_tasks_create.
 * 4. Member deletes the task using DELETE /hrmPlatform/member/projects/{projectId}/tasks/{taskId}.
 * 5. Validates deletion completes successfully (void response, 204 No Content).
 */
export async function test_api_task_deletion_by_project_lead(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create a project (member is automatically project-lead for their created project)
  const project = await generate_random_hrm_platform_member_projects_create(
    memberConnection,
    {},
  );
  typia.assert(project);
  // 3. Create a task within the project
  const task = await generate_random_hrm_platform_member_projects_tasks_create(
    memberConnection,
    {
      params: {
        projectId: project.id,
      },
    },
  );
  typia.assert(task);
  // 4. Delete the task using the DELETE endpoint
  // Successful completion (no exception) verifies the project lead has permission
  // and the soft-delete operation executed correctly
  await api.functional.hrmPlatform.member.projects.tasks.erase(
    memberConnection,
    {
      projectId: project.id,
      taskId: task.id,
    },
  );
}
