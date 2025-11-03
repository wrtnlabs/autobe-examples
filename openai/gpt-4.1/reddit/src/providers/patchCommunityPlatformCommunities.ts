import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPlatformCommunities(props: {
  body: ICommunityPlatformCommunity.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const { page, limit, search, creator_user_id, from_date, to_date, status } =
    props.body;

  const pageNum = Number(page) < 1 ? 1 : Number(page);
  const limitNum = Number(limit) < 1 ? 20 : Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Only return active or archived based on status param.
  // By default, show only active (deleted_at=null), if status==='archived', show only archived (deleted_at!=null)
  let deletedAtFilter: {};
  if (status === "archived") {
    deletedAtFilter = { deleted_at: { not: null } };
  } else {
    deletedAtFilter = { deleted_at: null };
  }

  // Build filters
  const where = {
    ...deletedAtFilter,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
    ...(creator_user_id !== undefined &&
      creator_user_id !== null && {
        creator_user_id,
      }),
    ...(from_date || to_date
      ? {
          created_at: {
            ...(from_date ? { gte: from_date } : {}),
            ...(to_date ? { lte: to_date } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limitNum,
      select: {
        id: true,
        name: true,
        description: true,
      },
    }),
    MyGlobal.prisma.community_platform_communities.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: total,
      pages: Math.ceil(total / limitNum),
    },
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
    })),
  };
}
