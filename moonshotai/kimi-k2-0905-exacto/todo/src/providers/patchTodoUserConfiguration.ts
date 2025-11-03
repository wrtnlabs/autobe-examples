import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";
import { IString } from "@ORGANIZATION/PROJECT-api/lib/structures/IString";
import { INull } from "@ORGANIZATION/PROJECT-api/lib/structures/INull";
import { IBoolean } from "@ORGANIZATION/PROJECT-api/lib/structures/IBoolean";
import { IPageITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchTodoUserConfiguration(props: {
  body: ITodoConfiguration.IRequest;
}): Promise<IPageITodoConfiguration> {
  const { page, limit, search, type, is_system } = props.body;
  const skip = (page - 1) * limit;

  // Build WHERE conditions - use null checks for nullable API types
  const where = {
    deleted_at: null, // Soft delete filter - exclude deleted configs
    ...(search !== undefined &&
      search !== null &&
      search && {
        OR: [
          { key: { contains: search } },
          { description: { contains: search } },
        ],
      }),
    ...(type !== undefined && type !== null && { type }),
    ...(is_system !== undefined && is_system !== null && { is_system }),
  };

  // Execute count and data queries concurrently
  const [configurations, total] = await Promise.all([
    MyGlobal.prisma.todo_configurations.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_configurations.count({ where }),
  ]);

  // Transform results to match API types
  const data: ITodoConfiguration[] = configurations.map((config) => ({
    id: config.id,
    key: config.key,
    value: config.value,
    description: config.description,
    type: config.type,
    is_system: config.is_system,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
  }));

  // Return paginated response with brand stripping
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
