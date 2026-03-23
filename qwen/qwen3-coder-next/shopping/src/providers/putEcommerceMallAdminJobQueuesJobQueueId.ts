import { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminJobQueuesJobQueueId(props: {
  admin: AdminPayload;
  jobQueueId: string;
  body: IEcommerceMallJobQueue.IUpdate;
}): Promise<IEcommerceMallJobQueue> {
  const jobQueue =
    await MyGlobal.prisma.ecommerce_mall_job_queues.findUniqueOrThrow({
      where: { id: props.jobQueueId },
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
      },
    });
  const updated = await MyGlobal.prisma.ecommerce_mall_job_queues.update({
    where: { id: props.jobQueueId },
    data: {
      status: props.body.status,
      retry_count: props.body.retry_count,
      last_error: props.body.last_error,
      started_at: props.body.started_at,
      finished_at: props.body.finished_at,
      updated_at: new Date(),
    },
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
    },
  });
  return {
    id: updated.id,
    job_name: updated.job_name,
    priority: updated.priority,
    status: updated.status,
    retry_count: updated.retry_count,
    max_retries: updated.max_retries,
    last_error: updated.last_error ?? undefined,
    started_at: updated.started_at ? toISOStringSafe(updated.started_at) : null,
    finished_at: updated.finished_at
      ? toISOStringSafe(updated.finished_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
