import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTaskHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_task_history } from "../prepare/prepare_random_hrm_time_tracking_task_history";

export async function generate_random_hrm_time_tracking_projects_tasks_histories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingTaskHistory.ICreate> | undefined;
    params: {
      projectId: string;
      taskId: string;
    };
  },
): Promise<IHrmTimeTrackingTaskHistory> {
  const prepared: IHrmTimeTrackingTaskHistory.ICreate =
    prepare_random_hrm_time_tracking_task_history(props.body);
  const result: IHrmTimeTrackingTaskHistory =
    await api.functional.hrmTimeTracking.projects.tasks.histories.create(
      connection,
      {
        projectId: props.params.projectId,
        taskId: props.params.taskId,
        body: prepared,
      },
    );
  return result;
}
