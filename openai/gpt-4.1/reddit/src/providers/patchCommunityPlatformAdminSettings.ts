import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSettings";
import { IPageICommunityPlatformSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSettings";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchCommunityPlatformAdminSettings(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSettings.IRequest;
}): Promise<IPageICommunityPlatformSettings.ISummary> {
  const { body } = props;
  const {
    setting_key,
    type,
    is_active,
    value,
    page,
    limit,
    sort_by,
    sort_direction,
  } = body;

  // Allowed sort columns
  const allowedSortCols = [
    "setting_key",
    "type",
    "is_active",
    "value",
    "created_at",
    "updated_at",
  ];
  const sortCol = allowedSortCols.includes(sort_by ?? "")
    ? sort_by
    : "created_at";
  const direction = sort_direction === "asc" ? "asc" : "desc";

  // Build where clause
  const where = {
    ...(typeof setting_key === "string" &&
      setting_key.length > 0 && {
        setting_key: {
          contains: setting_key,
        },
      }),
    ...(typeof type === "string" && type.length > 0 && { type: type }),
    ...(typeof is_active === "boolean" && { is_active: is_active }),
    ...(typeof value === "string" && value.length > 0 && { value: value }),
  };
  const skipNum = (Number(page) - 1) * Number(limit);
  const takeNum = Number(limit);
  // Query data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_settings.findMany({
      where,
      orderBy: { [sortCol!]: direction },
      skip: skipNum,
      take: takeNum,
      select: {
        id: true,
        setting_key: true,
        value: true,
        type: true,
        description: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_settings.count({ where }),
  ]);
  const data = rows.map((row) => ({
    id: row.id,
    setting_key: row.setting_key,
    value: row.value,
    type: row.type,
    description: row.description,
    is_active: row.is_active,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
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
