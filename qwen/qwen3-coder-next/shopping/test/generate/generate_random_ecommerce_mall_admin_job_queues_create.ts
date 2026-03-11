import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_job_queue } from "../prepare/prepare_random_ecommerce_mall_job_queue";

export async function generate_random_ecommerce_mall_admin_job_queues_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallJobQueue.ICreate> | undefined;
  },
): Promise<IEcommerceMallJobQueue> {
  const prepared: IEcommerceMallJobQueue.ICreate =
    prepare_random_ecommerce_mall_job_queue(props.body);
  return await api.functional.ecommerceMall.admin.job_queues.create(
    connection,
    {
      body: prepared,
    },
  );
}
