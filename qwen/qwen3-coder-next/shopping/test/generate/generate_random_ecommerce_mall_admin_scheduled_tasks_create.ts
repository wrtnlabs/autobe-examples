import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_scheduled_task } from "../prepare/prepare_random_ecommerce_mall_scheduled_task";

export async function generate_random_ecommerce_mall_admin_scheduled_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallScheduledTask.ICreate>;
  },
): Promise<IEcommerceMallScheduledTask> {
  const prepared: IEcommerceMallScheduledTask.ICreate =
    prepare_random_ecommerce_mall_scheduled_task(props.body);
  return await api.functional.ecommerceMall.admin.scheduled_tasks.create(
    connection,
    {
      body: prepared,
    },
  );
}
