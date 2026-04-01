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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
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
  } satisfies Prisma.ecommerce_mall_activity_logsWhereInput;
  const groupByFields: Array<
    "actor_type" | "entity_type" | "action_type" | "created_at"
  > = [];
  if (props.body.group_by !== undefined) {
    for (const dimension of props.body.group_by) {
      if (dimension === "actor_type") {
        groupByFields.push("actor_type");
      } else if (dimension === "entity_type") {
        groupByFields.push("entity_type");
      } else if (dimension === "action_type") {
        groupByFields.push("action_type");
      } else if (dimension === "date") {
        groupByFields.push("created_at");
      }
    }
  }
  if (groupByFields.length === 0) {
    groupByFields.push("actor_type", "entity_type", "action_type");
  }
  const orderBy: Prisma.ecommerce_mall_activity_logsOrderByWithAggregationInput[] =
    [];
  if (groupByFields.length > 0) {
    if (props.body.sort_by === "count") {
      const firstField = groupByFields[0];
      orderBy.push({
        _count: {
          [firstField]: props.body.sort_order === "desc" ? "desc" : "asc",
        },
      });
    } else if (props.body.sort_by === "actor_type") {
      if (groupByFields.includes("actor_type")) {
        orderBy.push({
          actor_type: props.body.sort_order === "desc" ? "desc" : "asc",
        });
      }
    } else if (props.body.sort_by === "entity_type") {
      if (groupByFields.includes("entity_type")) {
        orderBy.push({
          entity_type: props.body.sort_order === "desc" ? "desc" : "asc",
        });
      }
    } else if (props.body.sort_by === "action_type") {
      if (groupByFields.includes("action_type")) {
        orderBy.push({
          action_type: props.body.sort_order === "desc" ? "desc" : "asc",
        });
      }
    } else if (props.body.sort_by === "date") {
      if (groupByFields.includes("created_at")) {
        orderBy.push({
          created_at: props.body.sort_order === "desc" ? "desc" : "asc",
        });
      }
    }
  }
  const result = await MyGlobal.prisma.ecommerce_mall_activity_logs.groupBy({
    where: whereInput,
    by: groupByFields,
    ...(orderBy.length > 0 && { orderBy: orderBy as any }),
    _count: { id: true },
  } as any);
  const total = await MyGlobal.prisma.ecommerce_mall_activity_logs.count({
    where: whereInput,
  });
  const data = result.map((item: any) => ({
    actor_type: item.actor_type,
    entity_type: item.entity_type,
    action_type: item.action_type,
    count: item._count.id,
    created_at: toISOStringSafe(item.created_at),
  }));
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceMallActivityAggregation.ISummary;
}
