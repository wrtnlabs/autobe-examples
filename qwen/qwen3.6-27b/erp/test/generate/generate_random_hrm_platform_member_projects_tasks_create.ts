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
 * Generate a random task within a project for E2E testing.
 *
 * Prepares random task data using the prepare function, then creates the task
 * via the API endpoint. The task is created within the project specified by
 * the projectId parameter. Tasks represent discrete work items that track
 * progress through a lifecycle from open to closed status.
 *
 * This generation function requires a projectId as a prerequisite since tasks
 * must belong to an existing project. The prepare function generates random
 * values for title, description, assigned employee, parent task, status,
 * priority, estimated hours, and due date.
 */
export async function generate_random_hrm_platform_member_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformTask.ICreate>;
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
