import { IEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallJobQueue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallJobQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallJobQueue";
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

export async function patchEcommerceMallAdminJobQueues(props: {
  admin: AdminPayload;
  body: IEcommerceMallJobQueue.IRequest;
}): Promise<IPageIEcommerceMallJobQueue.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_job_queuesWhereInput = {
    deleted_at: props.body.includeDeleted ? undefined : { equals: null },
    ...(props.body.status && { status: { equals: props.body.status } }),
    ...(props.body.jobName && { job_name: { contains: props.body.jobName } }),
    ...(props.body.minRetryCount !== undefined && {
      retry_count: { gte: props.body.minRetryCount },
    }),
    ...(props.body.maxRetryCount !== undefined && {
      retry_count: { lte: props.body.maxRetryCount },
    }),
    ...(props.body.createdAfter && {
      created_at: { gte: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore && {
      created_at: { lte: new Date(props.body.createdBefore) },
    }),
    ...(props.body.startedAfter && {
      started_at: { gte: new Date(props.body.startedAfter) },
    }),
    ...(props.body.startedBefore && {
      started_at: { lte: new Date(props.body.startedBefore) },
    }),
  } satisfies Prisma.ecommerce_mall_job_queuesWhereInput;
  const orderBy = (
    props.body.sort === "created_at"
      ? { created_at: props.body.order ?? "desc" }
      : props.body.sort === "priority"
        ? { priority: props.body.order ?? "desc" }
        : props.body.sort === "retry_count"
          ? { retry_count: props.body.order ?? "desc" }
          : { created_at: "desc" }
  ) satisfies Prisma.ecommerce_mall_job_queuesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.ecommerce_mall_job_queues.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      job_name: true,
      priority: true,
      status: true,
      retry_count: true,
      started_at: true,
      finished_at: true,
      last_error: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_job_queues.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      job_name: record.job_name,
      priority: record.priority satisfies number as number satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      status: record.status,
      retry_count:
        record.retry_count satisfies number as number satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      started_at: toISOStringSafe(
        record.started_at ?? new Date("9999-12-31T23:59:59.999Z"),
      ),
      finished_at: toISOStringSafe(
        record.finished_at ?? new Date("9999-12-31T23:59:59.999Z"),
      ),
      last_error: record.last_error === null ? null : record.last_error,
      created_at: toISOStringSafe(record.created_at),
    })),
  };
}
