import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { IPageIShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminMallConfigurations(props: {
  admin: AdminPayload;
  body: IShoppingMallConfiguration.IRequest;
}): Promise<IPageIShoppingMallConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;

  const where: Record<string, any> = {};
  if (props.body.status) {
    where.status = props.body.status;
  }
  if (props.body.search) {
    where.OR = [
      { config_key: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  const allowedSortBy = [
    "config_key",
    "status",
    "created_at",
    "updated_at",
  ] as const;
  const sortByRaw = props.body.sort_by;
  const sortBy: (typeof allowedSortBy)[number] = allowedSortBy.includes(
    sortByRaw as any,
  )
    ? (sortByRaw as (typeof allowedSortBy)[number])
    : "created_at";
  const order: "asc" | "desc" = props.body.order === "desc" ? "desc" : "asc";
  const skip = (page - 1) * limit;

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_configurations.findMany({
      where,
      skip,
      take: limit,
      orderBy: Object.fromEntries([[sortBy, order]]) as any,
    }),
    MyGlobal.prisma.shopping_mall_configurations.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      config_key: row.config_key,
      status: row.status,
      description: row.description,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
