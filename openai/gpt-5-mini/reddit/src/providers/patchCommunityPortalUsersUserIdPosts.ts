import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import { IEPostSortMode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEPostSortMode";
import { IPageICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchCommunityPortalUsersUserIdPosts(props: {
  userId: string & tags.Format<"uuid">;
  body: ICommunityPortalPost.IRequest;
}): Promise<IPageICommunityPortalPost.ISummary> {
  const { userId, body } = props;

  // Ensure target user exists
  const user = await MyGlobal.prisma.community_portal_users.findUnique({
    where: { id: userId },
  });
  if (!user) throw new HttpException("Not Found", 404);

  // includeDeleted requires moderator/admin privileges; no auth provided in props
  if (body.includeDeleted) {
    throw new HttpException(
      "Forbidden: includeDeleted requires moderator or admin",
      403,
    );
  }

  // Pagination defaults and validation
  const limit = Number(body.limit ?? 20);
  const offset = Number(body.offset ?? 0);
  if (limit <= 0 || offset < 0)
    throw new HttpException("Bad Request: invalid pagination", 400);

  // Build where clause inline, checking both undefined and null for required fields
  const where = {
    author_user_id: userId,
    ...(body.postType !== undefined &&
      body.postType !== null && { post_type: body.postType }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.communityId !== undefined &&
      body.communityId !== null && { community_id: body.communityId }),
    deleted_at: null,
  };

  // Sorting: implementation-defined algorithms use created_at as a compatible fallback
  const orderBy: Prisma.community_portal_postsOrderByWithRelationInput = {
    created_at: "desc" as Prisma.SortOrder,
  };

  // Execute queries in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_portal_posts.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        post_type: true,
        community_id: true,
        author_user_id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_portal_posts.count({ where }),
  ]);

  // Map to summary DTO and convert dates
  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    post_type: r.post_type,
    community_id: r.community_id,
    author_user_id: r.author_user_id === null ? undefined : r.author_user_id,
    created_at: toISOStringSafe(r.created_at),
  }));

  return {
    pagination: {
      current: Number(Math.floor(offset / limit)),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
    data,
  };
}
