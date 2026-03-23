import { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallJobQueueTransformer {
  export type Payload = Prisma.ecommerce_mall_job_queuesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        job_name: true,
        priority: true,
        status: true,
        retry_count: true,
        max_retries: true,
        last_error: true,
        started_at: true,
        finished_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        dataPairs: true,
      },
    } satisfies Prisma.ecommerce_mall_job_queuesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallJobQueue> {
    return {
      id: input.id,
      job_name: input.job_name,
      priority: input.priority,
      status: input.status,
      retry_count: input.retry_count,
      max_retries: input.max_retries,
      last_error: input.last_error ?? undefined,
      started_at: input.started_at?.toISOString() ?? undefined,
      finished_at: input.finished_at?.toISOString() ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? undefined,
    };
  }
}
