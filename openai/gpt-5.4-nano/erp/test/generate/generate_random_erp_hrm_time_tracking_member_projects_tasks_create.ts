import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_time_tracking_task } from "../prepare/prepare_random_erp_hrm_time_tracking_task";

export async function generate_random_erp_hrm_time_tracking_member_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTimeTrackingTask.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IErpHrmTimeTrackingTask> {
  const prepared: IErpHrmTimeTrackingTask.ICreate =
    prepare_random_erp_hrm_time_tracking_task(props.body);
  const result: IErpHrmTimeTrackingTask =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.create(
      connection,
      {
        body: prepared,
        projectId: props.params.projectId,
      },
    );
  return result;
}
