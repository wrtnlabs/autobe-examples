import { IEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallScheduledTask";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallScheduledTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallScheduledTask";
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

export async function patchEcommerceMallAdminScheduledTasks(props: {
  admin: AdminPayload;
  body: IEcommerceMallScheduledTask.IRequest;
}): Promise<IPageIEcommerceMallScheduledTask.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build search condition using full-text search tsvector
  const searchCondition = props.body.search
    ? {
        OR: [
          { name: props.body.search },
          { description: props.body.search },
          { last_execution_error: props.body.search },
        ],
      }
    : {};
  // Build simple filter conditions
  const whereCondition: Prisma.ecommerce_mall_scheduled_tasksWhereInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.last_execution_status && {
      last_execution_status: props.body.last_execution_status,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...searchCondition,
  };
  // Build order by condition
  let orderByInput:
    | Prisma.ecommerce_mall_scheduled_tasksOrderByWithRelationInput
    | Prisma.ecommerce_mall_scheduled_tasksOrderByWithRelationInput[] = {
    created_at: "desc" as const,
  };
  if (props.body.sort_by) {
    const sortField = props.body.sort_by;
    const sortOrder = props.body.sort_order ?? "desc";
    const validFields = [
      "created_at",
      "updated_at",
      "next_execution_at",
      "last_execution_duration_seconds",
      "name",
      "status",
    ];
    if (validFields.includes(sortField)) {
      orderByInput = {
        [sortField]: sortOrder === "asc" ? "asc" : "desc",
      } satisfies Prisma.ecommerce_mall_scheduled_tasksOrderByWithRelationInput;
    }
  }
  // Fetch paginated data
  const tasks = await MyGlobal.prisma.ecommerce_mall_scheduled_tasks.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      description: true,
      cron_expression: true,
      next_execution_at: true,
      is_active: true,
      status: true,
      last_execution_status: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.ecommerce_mall_scheduled_tasks.count({
    where: whereCondition,
  });
  // Transform to summary DTO
  const data: IEcommerceMallScheduledTask.ISummary[] = tasks.map((task) => ({
    id: task.id as string & tags.Format<"uuid">,
    name: task.name,
    description: task.description,
    cron_expression: task.cron_expression,
    next_execution_at: toISOStringSafe(task.next_execution_at),
    is_active: task.is_active,
    status: task.status,
    last_execution_status: task.last_execution_status,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceMallScheduledTask.ISummary;
}
