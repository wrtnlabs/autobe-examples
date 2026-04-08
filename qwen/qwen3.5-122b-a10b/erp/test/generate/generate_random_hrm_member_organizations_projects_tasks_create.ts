import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import type { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import type { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import type { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import type { IHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_task } from "../prepare/prepare_random_hrm_task";

/**
 * Generate a random HRM task within a specific project via the API for E2E testing.
 *
 * Prepares random task data using the prepare function, then calls the creation endpoint.
 * The task is created within the specified project and can be assigned to an employee.
 *
 * This function requires both organizationId and projectId as URL parameters since tasks
 * are scoped to projects within organizations. The prepare function generates random values
 * for all task properties including title, description, priority, status, and optional
 * assignment details.
 *
 * @param connection The API connection for authentication and endpoint access
 * @param props.body Optional partial task creation data to override random values
 * @param props.params.organizationId The organization ID containing the target project
 * @param props.params.projectId The project ID where the task will be created
 * @returns The created task with all system-generated fields (id, timestamps, relationships)
 */
export async function generate_random_hrm_member_organizations_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTask.ICreate>;
    params: {
      organizationId: string;
      projectId: string;
    };
  },
): Promise<IHrmTask> {
  const prepared: IHrmTask.ICreate = prepare_random_hrm_task(props.body);
  const result: IHrmTask =
    await api.functional.hrm.member.organizations.projects.tasks.create(
      connection,
      {
        organizationId: props.params.organizationId,
        projectId: props.params.projectId,
        body: prepared,
      },
    );
  return result;
}
