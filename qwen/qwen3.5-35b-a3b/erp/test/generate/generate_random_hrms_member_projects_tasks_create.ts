import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_task } from "../prepare/prepare_random_hrms_task";

export async function generate_random_hrms_member_projects_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsTask.ICreate> | undefined;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmsTask> {
  const prepared: IHrmsTask.ICreate = prepare_random_hrms_task(props.body);
  return await api.functional.hrms.member.projects.tasks.create(connection, {
    body: prepared,
    projectId: props.params.projectId,
  });
}
