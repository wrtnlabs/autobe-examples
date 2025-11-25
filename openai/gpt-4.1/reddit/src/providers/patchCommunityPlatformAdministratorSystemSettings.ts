import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSettings";
import { IPageICommunityPlatformSystemSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSettings";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorSystemSettings(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformSystemSettings.IRequest;
}): Promise<IPageICommunityPlatformSystemSettings> {
  const {
    key,
    value,
    created_from,
    created_to,
    updated_from,
    updated_to,
    deleted,
    sort_by,
    sort_direction,
    page = 1,
    page_size = 100,
  } = props.body;

  // Compose filters for 'created_at' and 'updated_at' step by step
  const createdAtFilter: Record<string, string> = {};
  if (created_from) createdAtFilter.gte = created_from;
  if (created_to) createdAtFilter.lte = created_to;

  const updatedAtFilter: Record<string, string> = {};
  if (updated_from) updatedAtFilter.gte = updated_from;
  if (updated_to) updatedAtFilter.lte = updated_to;

  const where: Record<string, unknown> = {
    ...(key && { key: { contains: key } }),
    ...(value && { value: { contains: value } }),
    ...(Object.keys(createdAtFilter).length > 0
      ? { created_at: createdAtFilter }
      : {}),
    ...(Object.keys(updatedAtFilter).length > 0
      ? { updated_at: updatedAtFilter }
      : {}),
    ...(typeof deleted === "boolean"
      ? deleted
        ? { deleted_at: { not: null } }
        : { deleted_at: null }
      : {}),
  };

  const actualSortBy = sort_by ?? "key";
  const actualSortDir = sort_direction ?? "asc";
  const take = Math.max(1, Math.min(Number(page_size), 100));
  const skip = (Number(page) - 1) * take;

  const [settings, total] = await Promise.all([
    MyGlobal.prisma.community_platform_system_settings.findMany({
      where,
      orderBy: { [actualSortBy]: actualSortDir },
      skip,
      take,
    }),
    MyGlobal.prisma.community_platform_system_settings.count({ where }),
  ]);

  return {
    data: settings.map((setting) => ({
      id: setting.id,
      key: setting.key,
      value: setting.value,
      description: setting.description ?? undefined,
      created_at: toISOStringSafe(setting.created_at),
      updated_at: toISOStringSafe(setting.updated_at),
      deleted_at:
        setting.deleted_at !== null && setting.deleted_at !== undefined
          ? toISOStringSafe(setting.deleted_at)
          : undefined,
    })),
    pagination: {
      current: Number(page),
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
  };
}
