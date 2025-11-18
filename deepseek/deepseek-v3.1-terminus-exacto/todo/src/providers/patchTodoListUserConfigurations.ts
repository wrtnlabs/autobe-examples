import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListConfiguration";
import { IPageITodoListConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserConfigurations(props: {
  user: UserPayload;
  body: ITodoListConfiguration.IRequest;
}): Promise<IPageITodoListConfiguration.ISummary> {
  // Use default pagination since IRequest doesn't include page/limit
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build WHERE conditions based on filter parameters
  const whereConditions: Record<string, unknown> = {
    deleted_at: props.body.include_deleted ? undefined : null,
  };

  // Key filtering (partial match)
  if (props.body.key !== undefined) {
    whereConditions.key = { contains: props.body.key };
  }

  // Category filtering (exact match)
  if (props.body.category !== undefined) {
    whereConditions.category = props.body.category;
  }

  // Date range filtering - convert string dates to Date objects for Prisma
  if (props.body.created_at !== undefined) {
    whereConditions.created_at = { gte: new Date(props.body.created_at) };
  }

  if (props.body.updated_at !== undefined) {
    whereConditions.updated_at = { gte: new Date(props.body.updated_at) };
  }

  if (props.body.deleted_at !== undefined) {
    whereConditions.deleted_at = { gte: new Date(props.body.deleted_at) };
  }

  // Execute paginated query
  const [configurations, total] = await Promise.all([
    MyGlobal.prisma.todo_list_configurations.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_configurations.count({
      where: whereConditions,
    }),
  ]);

  // Convert to API response format
  const data = configurations.map((config) => ({
    id: config.id as string & tags.Format<"uuid">,
    key: config.key,
    value: config.value,
    description: config.description ?? undefined,
    category: config.category ?? undefined,
    created_at: config.created_at
      ? toISOStringSafe(config.created_at)
      : undefined,
    updated_at: config.updated_at
      ? toISOStringSafe(config.updated_at)
      : undefined,
    deleted_at: config.deleted_at
      ? toISOStringSafe(config.deleted_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
