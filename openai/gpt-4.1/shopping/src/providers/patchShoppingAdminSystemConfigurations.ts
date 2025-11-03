import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSystemConfiguration";
import { IPageIShoppingSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingSystemConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingAdminSystemConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingSystemConfiguration.IRequest;
}): Promise<IPageIShoppingSystemConfiguration.ISummary> {
  const {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    configKey,
    configValue,
    createdFrom,
    createdTo,
    description,
  } = props.body;

  // Calculate skip for pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Filtering conditions
  const where = {
    deleted_at: null,
    ...(configKey !== undefined && { config_key: configKey }),
    ...(configValue !== undefined && {
      config_value: { contains: configValue },
    }),
    ...(description !== undefined && {
      description: { contains: description },
    }),
    ...(createdFrom !== undefined || createdTo !== undefined
      ? {
          created_at: {
            ...(createdFrom !== undefined && { gte: createdFrom }),
            ...(createdTo !== undefined && { lte: createdTo }),
          },
        }
      : {}),
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            { config_key: { contains: search } },
            { config_value: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  // Valid sort fields
  const allowedSortFields = ["created_at", "updated_at", "config_key"];
  const sortField = allowedSortFields.includes(sortBy ?? "")
    ? (sortBy as "created_at" | "updated_at" | "config_key")
    : "created_at";
  const order: "asc" | "desc" = sortOrder === "desc" ? "desc" : "asc";

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_system_configurations.findMany({
      where,
      orderBy: { [sortField]: order },
      skip,
      take: Number(limit),
      select: {
        id: true,
        config_key: true,
        config_value: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_system_configurations.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    config_key: row.config_key,
    config_value: row.config_value,
    description: row.description ?? undefined,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
