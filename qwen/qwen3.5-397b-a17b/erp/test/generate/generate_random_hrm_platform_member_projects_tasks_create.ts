import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_task } from "../prepare/prepare_random_hrm_platform_task";

/**
 * Generate a random HRM platform task via the API for E2E testing.
 *
 * Creates a new task within the specified project by preparing random task data
 * using the prepare function and calling the task creation endpoint. The task
 * is associated with the project identified by the projectId path parameter.
 *
 * The generation function supports partial input override via DeepPartial,
 * allowing tests to customize specific task properties (title, priority, status,
 * description, estimated_hours, due_date, assigned_employee_id, parent_task_id)
 * while auto-generating the remaining fields. This is useful for testing
 * specific scenarios like high-priority tasks, assigned tasks, or subtasks.
 *
 * The created task includes all fields: id, title, description, status, priority,
 * estimated_hours, due_date, timestamps (created_at, updated_at, deleted_at),
 * and relational data (project, assignedEmployee, parentTask, subtasks).
 *
 * @param connection - API connection information for the test server
 * @param props - Generation options including optional body overrides and required projectId
 * @param props.body - Optional partial task creation data to override specific properties
 * @param props.params - URL path parameters for the API endpoint
 * @param props.params.projectId - UUID of the parent project this task will belong to
 * @returns Promise resolving to the created IHrmPlatformTask entity
 */
export async function generate_random_hrm_platform_member_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformTask.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmPlatformTask> {
  const prepared: IHrmPlatformTask.ICreate = prepare_random_hrm_platform_task(
    props.body,
  );
  const result: IHrmPlatformTask =
    await api.functional.hrmPlatform.member.projects.tasks.create(connection, {
      projectId: props.params.projectId,
      body: prepared,
    });
  return result;
}
