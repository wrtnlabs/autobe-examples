import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";

export async function getCommunityPortalCommunitiesCommunityIdPosts(props: {
  communityId: string & tags.Format<"uuid">;
  sort: string;
  limit: number & tags.Type<"int32">;
  offset: number & tags.Type<"int32">;
}): Promise<IPageICommunityPortalPost> {
  const { communityId, sort, limit, offset } = props;

  // Business validations
  const allowedSorts = ["hot", "new", "top", "controversial"];
  if (!allowedSorts.includes(sort))
    throw new HttpException("Bad Request: invalid sort parameter", 400);
  if (Number(limit) < 1 || Number(limit) > 100)
    throw new HttpException(
      "Bad Request: limit must be between 1 and 100",
      400,
    );
  if (Number(offset) < 0)
    throw new HttpException("Bad Request: offset must be >= 0", 400);

  // Verify community existence and visibility
  const community =
    await MyGlobal.prisma.community_portal_communities.findUnique({
      where: { id: communityId },
      select: { id: true, is_private: true },
    });
  if (!community) throw new HttpException("Not Found", 404);
  if (community.is_private)
    throw new HttpException("Forbidden: private community", 403);

  // Build where/orderBy inline
  const orderBy: Prisma.community_portal_postsOrderByWithRelationInput =
    sort === "new"
      ? ({ created_at: "desc" } as const)
      : sort === "top"
        ? ({ updated_at: "desc" } as const)
        : // 'hot' and 'controversial' placeholder ordering until backend algorithm defined
          ({ created_at: "desc" } as const);

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.community_portal_posts.findMany({
      where: {
        community_id: communityId,
        status: "published",
        deleted_at: null,
      },
      orderBy,
      skip: Number(offset),
      take: Number(limit),
      select: {
        id: true,
        community_id: true,
        author_user_id: true,
        post_type: true,
        title: true,
        body: true,
        link_url: true,
        image_url: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_portal_posts.count({
      where: {
        community_id: communityId,
        status: "published",
        deleted_at: null,
      },
    }),
  ]);

  const data: ICommunityPortalPost[] = rows.map((r) => {
    // Compose a small preview for feed
    const previewSource = r.body ?? r.link_url ?? r.image_url ?? null;
    const preview =
      typeof previewSource === "string"
        ? previewSource.slice(0, 200)
        : undefined;

    return {
      id: r.id as string & tags.Format<"uuid">,
      community_id: r.community_id as string & tags.Format<"uuid">,
      author_user_id:
        r.author_user_id === null
          ? undefined
          : (r.author_user_id as string & tags.Format<"uuid">),
      post_type: r.post_type,
      title: r.title,
      body: r.body ?? undefined,
      link_url: r.link_url ?? undefined,
      image_url: r.image_url ?? undefined,
      status: r.status,
      created_at: toISOStringSafe(r.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(r.updated_at) as string &
        tags.Format<"date-time">,
    } as ICommunityPortalPost;
  });

  const pagination: IPage.IPagination = {
    current: Number(Math.floor(Number(offset) / Number(limit)) + 1),
    limit: Number(limit),
    records: total,
    pages: Number(Math.ceil(total / Number(limit))),
  };

  return { pagination, data };
}
