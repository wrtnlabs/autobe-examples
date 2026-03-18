import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_task } from "../prepare/prepare_random_hrm_time_tracking_task";

export async function generate_random_hrm_time_tracking_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTask.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmTimeTrackingTask> {
  const prepared: IHrmTimeTrackingTask.ICreate =
    prepare_random_hrm_time_tracking_task(props.body);
  const result: IHrmTimeTrackingTask =
    await api.functional.hrmTimeTracking.projects.tasks.create(connection, {
      body: prepared,
      projectId: props.params.projectId,
    });
  return result;
}
