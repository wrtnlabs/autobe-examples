import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchTodoAppConfigurations(props: {
  body: ITodoAppConfiguration.IRequest;
}): Promise<IPageITodoAppConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "key";
  const order = props.body.order ?? "asc";

  // Build dynamic WHERE conditions
  const whereConditions: any = {
    deleted_at: null,
  };

  if (props.body.search) {
    whereConditions.OR = [
      { key: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  if (props.body.category) {
    whereConditions.category = props.body.category;
  }

  if (props.body.is_enabled !== undefined) {
    whereConditions.is_enabled = props.body.is_enabled;
  }

  // Validate sort field
  const allowedSortFields = ["key", "category", "created_at", "updated_at"];
  const orderByField = allowedSortFields.includes(sortBy) ? sortBy : "key";

  const [configurations, total] = await Promise.all([
    MyGlobal.prisma.todo_app_configurations.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [orderByField]: order },
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        is_enabled: true,
      },
    }),
    MyGlobal.prisma.todo_app_configurations.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: configurations.map((config) => ({
      id: config.id satisfies string as string,
      key: config.key,
      value: config.value,
      description: config.description ?? "",
      is_enabled: config.is_enabled,
    })),
  };
}
