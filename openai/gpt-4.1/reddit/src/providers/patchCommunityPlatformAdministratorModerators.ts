import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorModerators(props: {
  administrator: AdministratorPayload;
  body: ICommunityPlatformModerator.IRequest;
}): Promise<IPageICommunityPlatformModerator.ISummary> {
  const {
    email,
    status,
    business_status,
    created_from,
    created_to,
    updated_from,
    updated_to,
    deleted,
    sort_by,
    sort_order = "desc",
    page,
    limit,
  } = props.body;

  // Build where conditions
  const where: Record<string, unknown> = {
    ...(email && { email: { contains: email } }),
    ...(status && { status }),
    ...(business_status && { business_status }),
    ...(typeof deleted === "boolean"
      ? { deleted_at: deleted ? { not: null } : null }
      : { deleted_at: null }),
    ...(created_from || created_to
      ? {
          created_at: {
            ...(created_from && { gte: created_from }),
            ...(created_to && { lte: created_to }),
          },
        }
      : {}),
    ...(updated_from || updated_to
      ? {
          updated_at: {
            ...(updated_from && { gte: updated_from }),
            ...(updated_to && { lte: updated_to }),
          },
        }
      : {}),
  };

  // Sorting field mapping
  const sortField = sort_by ?? "created_at";
  const sortOrder = sort_order === "asc" ? "asc" : "desc";

  // Pagination calculation
  const skip = (page - 1) * limit;
  const take = limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderators.findMany({
      where,
      skip,
      take,
      orderBy: { [sortField]: sortOrder },
      select: { id: true },
    }),
    MyGlobal.prisma.community_platform_moderators.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((mod) => ({ id: mod.id })),
  };
}
