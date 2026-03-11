import { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallJobQueueCollector {
  export async function collect(props: {
    body: IEcommerceMallJobQueue.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      job_name: props.body.job_name,
      priority: props.body.priority ?? 0,
      status: "pending",
      retry_count: 0,
      max_retries: props.body.max_retries ?? 0,
      last_error: null,
      started_at: null,
      finished_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      dataPairs: undefined,
    } satisfies Prisma.ecommerce_mall_job_queuesCreateInput;
  }
}
