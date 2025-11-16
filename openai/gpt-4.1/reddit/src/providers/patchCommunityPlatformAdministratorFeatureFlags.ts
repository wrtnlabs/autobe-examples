import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IPageICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorFeatureFlags(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformFeatureFlag.IRequest;
}): Promise<IPageICommunityPlatformFeatureFlag.ISummary> {
  const { flag_key, flag_type, status, query, page, limit } = props.body;
  const pageNumber = page;
  const pageSize = limit;
  const skip = (pageNumber - 1) * pageSize;

  // Build dynamic 'where' clause
  const where: Record<string, any> = { deleted_at: null };
  if (flag_key !== undefined && flag_key !== null) where.flag_key = flag_key;
  if (flag_type !== undefined && flag_type !== null)
    where.flag_type = flag_type;
  if (status !== undefined && status !== null) where.status = status;
  if (query !== undefined && query !== null && query.trim() !== "") {
    where.OR = [
      { flag_key: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { status: { contains: query, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: query, mode: Prisma.QueryMode.insensitive } },
    ];
  }
  const [result, total] = await Promise.all([
    MyGlobal.prisma.community_platform_feature_flags.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.community_platform_feature_flags.count({ where }),
  ]);
  const data = result.map((row) => ({
    id: row.id,
    flag_key: row.flag_key,
    flag_type: row.flag_type,
    status: row.status,
    description: row.description ?? null,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at !== null ? toISOStringSafe(row.deleted_at) : null,
  }));
  const pages = Math.ceil(total / pageSize);
  const pagination = {
    current: pageNumber,
    limit: pageSize,
    records: total,
    pages,
  };
  return {
    pagination,
    data,
  };
}
