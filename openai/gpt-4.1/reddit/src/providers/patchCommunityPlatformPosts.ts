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

export async function patchCommunityPlatformPosts(props: {
  body: ICommunityPlatformPost.IRequest;
}): Promise<IPageICommunityPlatformPost.ISummary> {
  const body = props.body;
  // Pagination handling
  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 20) as number;
  const skip = (page - 1) * limit;

  // Only expose certain statuses by default to guests
  const publish_statuses = ["published"];
  let statusFilter: string[] | undefined = undefined;
  if (body.status) {
    statusFilter = [body.status];
  } else {
    statusFilter = publish_statuses;
  }

  // Build where clause
  const where = {
    deleted_at: null,
    ...(body.community_platform_community_id !== undefined && {
      community_platform_community_id: body.community_platform_community_id,
    }),
    ...(body.content_type !== undefined && {
      content_type: body.content_type,
    }),
    ...(body.search !== undefined &&
      body.search.length > 0 && {
        OR: [
          { title: { contains: body.search } },
          { content_body: { contains: body.search } },
        ],
      }),
    ...(statusFilter !== undefined && {
      status:
        statusFilter.length === 1 ? statusFilter[0] : { in: statusFilter },
    }),
  };

  // Query data and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_platform_posts.findMany({
      where,
      orderBy:
        body.sort_by === "new" ||
        body.sort_by === undefined ||
        body.sort_by === "created_at"
          ? { created_at: "desc" as const }
          : body.sort_by === "top"
            ? { created_at: "desc" as const }
            : body.sort_by === "hot"
              ? { created_at: "desc" as const }
              : body.sort_by === "controversial"
                ? { created_at: "desc" as const }
                : { created_at: "desc" as const },
      skip,
      take: limit,
      select: {
        id: true,
        community_platform_member_id: true,
        community_platform_community_id: true,
        title: true,
        content_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_posts.count({ where }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    community_platform_member_id: row.community_platform_member_id,
    community_platform_community_id: row.community_platform_community_id,
    title: row.title,
    content_type: row.content_type,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
