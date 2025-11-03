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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserConfigurations(props: {
  user: UserPayload;
  body: ITodoConfiguration.IRequest;
}): Promise<IPageITodoConfiguration> {
  const { page, limit, search, type, is_system } = props.body;

  // Calculate pagination
  const currentPage = Number(page);
  const pageLimit = Number(limit);
  const skip = (currentPage - 1) * pageLimit;

  // Build dynamic where clause
  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  // Add search filter if provided
  if (search !== undefined && search !== null && search !== "") {
    whereConditions.OR = [
      { key: { contains: search } },
      { description: { contains: search } },
    ];
  }

  // Add type filter if provided
  if (type !== undefined && type !== null) {
    whereConditions.type = type;
  }

  // Add is_system filter if provided
  if (is_system !== undefined && is_system !== null) {
    whereConditions.is_system = is_system;
  }

  // Execute paginated query
  const [configurations, total] = await Promise.all([
    MyGlobal.prisma.todo_configurations.findMany({
      where: whereConditions,
      orderBy: { created_at: "desc" },
      skip,
      take: pageLimit,
    }),
    MyGlobal.prisma.todo_configurations.count({ where: whereConditions }),
  ]);

  // Convert to response format
  return {
    pagination: {
      current: currentPage,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data: configurations.map((config) => ({
      id: config.id as string & tags.Format<"uuid">,
      key: config.key,
      value: config.value,
      description: config.description,
      type: config.type,
      is_system: config.is_system,
      created_at: toISOStringSafe(config.created_at),
      updated_at: toISOStringSafe(config.updated_at),
      deleted_at: config.deleted_at ? toISOStringSafe(config.deleted_at) : null,
    })),
  };
}
