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
  const { body } = props;

  // Pagination defaults and validation
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 50;

  const page = body.page && body.page >= 1 ? body.page : DEFAULT_PAGE;
  const limit =
    body.limit && body.limit >= 1
      ? Math.min(body.limit, MAX_LIMIT)
      : DEFAULT_LIMIT;
  if (page < 1) {
    throw new HttpException("Page number must be at least 1", 400);
  }
  if (limit < 1 || limit > MAX_LIMIT) {
    throw new HttpException("Limit must be between 1 and 50", 400);
  }

  // Soft-deleted exclusion and filters
  const where = {
    deleted_at: null,
    ...(body.status !== undefined && { status: body.status }),
    ...(body.search && body.search.length > 0
      ? {
          OR: [
            { name: { contains: body.search } },
            { title: { contains: body.search } },
            { slug: { contains: body.search } },
            { description: { contains: body.search } },
          ],
        }
      : {}),
  };

  // Inline orderBy using Prisma.SortOrder for type safety
  const asc: Prisma.SortOrder = "asc";
  const desc: Prisma.SortOrder = "desc";

  const orderBy =
    body.sort === "new"
      ? { created_at: body.order === "asc" ? asc : desc }
      : body.sort === "top"
        ? { updated_at: body.order === "asc" ? asc : desc }
        : body.sort === "controversial"
          ? { title: body.order === "asc" ? asc : desc }
          : { created_at: desc };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_communities.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        title: true,
        slug: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_communities.count({ where }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      title: row.title,
      slug: row.slug,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
