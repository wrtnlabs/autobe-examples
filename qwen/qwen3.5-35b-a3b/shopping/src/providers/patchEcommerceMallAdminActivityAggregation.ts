import { IEcommerceMallActivityAggregation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallActivityAggregation";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallActivityAggregation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallActivityAggregation";
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

export async function patchEcommerceMallAdminActivityAggregation(props: {
  admin: AdminPayload;
  body: IEcommerceMallActivityAggregation.IRequest;
}): Promise<IPageIEcommerceMallActivityAggregation.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_activity_logsWhereInput = {
    deleted_at: null,
    ...(props.body.from !== undefined && {
      created_at: { gte: new Date(props.body.from) },
    }),
    ...(props.body.to !== undefined && {
      created_at: { lte: new Date(props.body.to) },
    }),
    ...(props.body.actor_types !== undefined && {
      actor_type: { in: props.body.actor_types },
    }),
    ...(props.body.entity_types !== undefined && {
      entity_type: { in: props.body.entity_types },
    }),
    ...(props.body.action_types !== undefined && {
      action_type: { in: props.body.action_types },
    }),
  };
  const groupByInput: string[] = props.body.group_by ?? [];
  const orderByInput: Prisma.ecommerce_mall_activity_logsOrderByWithRelationInput[] =
    groupByInput.length > 0
      ? [{ created_at: props.body.sort_order === "desc" ? "desc" : "asc" }]
      : [];
  const rawResults: Array<{
    actor_type: string;
    entity_type: string;
    action_type: string;
    count: bigint;
    created_at: Date | null;
  }> = await MyGlobal.prisma.ecommerce_mall_activity_logs.groupBy({
    where: whereInput,
    by:
      groupByInput.length > 0
        ? groupByInput
        : ["actor_type", "entity_type", "action_type"],
    orderBy: orderByInput,
    take: limit,
    skip: skip,
    _aggregate: {
      created_at: "min",
    },
  } as any);
  const total: number =
    await MyGlobal.prisma.ecommerce_mall_activity_logs.count({
      where: whereInput,
    });
  const summaryData: Array<IEcommerceMallActivityAggregation.ISummary> =
    rawResults.map((row) => ({
      actor_type: row.actor_type,
      entity_type: row.entity_type,
      action_type: row.action_type,
      count: Number(row.count) as number & tags.Type<"int32"> & tags.Minimum<1>,
      created_at: toISOStringSafe(row.created_at ?? new Date()),
    }));
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    data: summaryData,
    pagination: pagination,
  } satisfies IPageIEcommerceMallActivityAggregation.ISummary;
}
