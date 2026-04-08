import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_task } from "../prepare/prepare_random_hrm_platform_task";

export async function generate_random_hrm_platform_member_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformTask.ICreate> | undefined;
  },
): Promise<IHrmPlatformTask> {
  const prepared: IHrmPlatformTask.ICreate = prepare_random_hrm_platform_task(
    props.body,
  );
  const result: IHrmPlatformTask =
    await api.functional.hrmPlatform.member.tasks.create(connection, {
      body: prepared,
    });
  return result;
}
