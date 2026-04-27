import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_task } from "../prepare/prepare_random_hrm_time_tracking_task";

/**
 * Generate a random HRM time tracking task within a project via the API for E2E testing.
 *
 * Prepares random task creation data using the prepare function, then calls
 * the task creation endpoint within the specified project. The generated task
 * includes randomized values for title, description, priority, estimated hours,
 * due date, employee assignment, and parent task reference.
 *
 * The {@link props.params.projectId} is required and must reference an existing
 * project within the organization context. The returned task includes
 * server-generated fields such as id, status (defaults to 'open'), and
 * timestamps (createdAt, updatedAt).
 *
 * @param connection - The API connection configuration
 * @param props - Object containing optional body overrides and required projectId parameter
 * @param props.body - Optional partial overrides for task creation fields
 * @param props.params - Required URL parameters
 * @param props.params.projectId - The unique identifier (UUID) of the project
 * @returns The created task with all fields including server-generated values
 */
export async function generate_random_hrm_time_tracking_member_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTask.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmTimeTrackingTask> {
  const prepared: IHrmTimeTrackingTask.ICreate = prepare_random_hrm_time_tracking_task(
    props.body,
  );
  const result: IHrmTimeTrackingTask = await api.functional.hrmTimeTracking.member.projects.tasks.create(
    connection,
    {
      projectId: props.params.projectId,
      body: prepared,
    },
  );
  return result;
}