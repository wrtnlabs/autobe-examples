import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_erp_hrm_task } from "../prepare/prepare_random_erp_hrm_task";

export async function generate_random_erp_hrm_admin_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmTask.ICreate>;
    params: {
      projectId: string;
    };
  },
): Promise<IErpHrmTask> {
  const prepared: IErpHrmTask.ICreate = prepare_random_erp_hrm_task(props.body);
  const result: IErpHrmTask =
    await api.functional.erpHrm.admin.projects.tasks.create(connection, {
      projectId: props.params.projectId,
      body: prepared,
    });
  return result;
}
