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

export async function patchCommunityPortalCommunitiesCommunityIdPosts(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPortalPost.IRequest;
}): Promise<IPageICommunityPortalPost.ISummary> {
  const { communityId, body } = props;

  // Verify community exists
  const community =
    await MyGlobal.prisma.community_portal_communities.findUnique({
      where: { id: communityId },
      select: { id: true, is_private: true, visibility: true },
    });
  if (!community) throw new HttpException("Not Found", 404);

  // Access control: no auth in props => unauthenticated caller
  if (community.is_private === true) {
    throw new HttpException("Forbidden", 403);
  }

  // Pagination and validation
  const limit = Number((body.limit ?? 10) as unknown as number) || 10;
  if (limit < 1 || limit > 100)
    throw new HttpException("Bad Request: invalid limit", 400);
  const offset = Number((body.offset ?? 0) as unknown as number) || 0;

  // Build where inline
  const where = {
    community_id: communityId,
    deleted_at: null,
    ...(body.postType !== undefined &&
      body.postType !== null && { post_type: body.postType }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.q !== undefined &&
      body.q !== null && {
        OR: [{ title: { contains: body.q } }, { body: { contains: body.q } }],
      }),
    ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          created_at: {
            ...(body.createdFrom !== undefined &&
              body.createdFrom !== null && { gte: body.createdFrom }),
            ...(body.createdTo !== undefined &&
              body.createdTo !== null && { lte: body.createdTo }),
          },
        }
      : {}),
  };

  // Narrow created_at order literal to avoid widened string type
  const orderBy = { created_at: "desc" as const };

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

  return {
    pagination: {
      current: Number(offset),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((r) => ({
      id: r.id,
      title: r.title,
      post_type: r.post_type,
      community_id: r.community_id,
      author_user_id: r.author_user_id ?? undefined,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
