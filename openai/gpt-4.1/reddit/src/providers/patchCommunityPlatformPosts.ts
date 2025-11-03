import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

export async function patchCommunityPlatformPosts(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const body = props.body;
  // Defaults for page/limit
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const offset = (page - 1) * limit;

  // Filters for where clause
  const where: Record<string, any> = {
    deleted_at: null,
    ...(body.community_id !== undefined && {
      community_platform_community_id: body.community_id,
    }),
    ...(body.author_id !== undefined && {
      community_platform_user_id: body.author_id,
    }),
    ...(body.status !== undefined && { status: body.status }),
    // Exclude posts with deleted/archived status by default if no status filter is given
    ...(body.status === undefined && {
      status: { notIn: ["deleted", "archived"] },
    }),
    // Text search (title contains); ignore query if empty string or only whitespace
    ...(body.query &&
      body.query.trim().length > 0 && {
        title: { contains: body.query },
      }),
  };

  // Main post records with joined community and user, exclude posts whose community is soft-deleted/archived
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_posts.findMany({
      where,
      orderBy:
        body.sort === "new" ? { created_at: "desc" } : { created_at: "desc" },
      skip: offset,
      take: limit,
      include: {
        community: true,
        user: true,
      },
    }),
    MyGlobal.prisma.community_platform_posts.count({ where }),
  ]);

  // Filter out posts whose related community is deleted or archived
  const posts = rows.filter((row) => row.community.deleted_at == null);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: posts.map((row) => ({
      id: row.id,
      community: {
        id: row.community.id,
        name: row.community.name,
        description: row.community.description,
      },
      user: {
        id: row.user.id,
        display_name: row.user.display_name,
      },
      title: row.title,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: row.updated_at ? toISOStringSafe(row.updated_at) : undefined,
    })),
  };
}
