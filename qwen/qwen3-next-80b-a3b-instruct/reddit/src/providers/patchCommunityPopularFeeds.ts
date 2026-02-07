import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPopularFeeds(props: {
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Use the materialized view for optimized read performance
  const data =
    await MyGlobal.prisma.community_mv_community_popular_feeds.findMany({
      where: { is_active: true },
      skip,
      take: limit,
      orderBy: { sort_order: "desc" },
      select: {
        id: true,
        community_post_id: true,
        sort_algorithm: true,
        sort_order: true,
        title: true,
        author_username: true,
        community_name: true,
        vote_score: true,
        comment_count: true,
        post_type: true,
        content_preview: true,
        created_at: true,
        last_updated: true,
        domain_name: true,
        thumbnail_url: true,
      },
    });
  const total =
    await MyGlobal.prisma.community_mv_community_popular_feeds.count({
      where: { is_active: true },
    });
  return {
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      title: item.title as string,
      author: {
        id: item.community_post_id as string & tags.Format<"uuid">,
        username: item.author_username as string,
      },
      community: {
        id: item.community_post_id as string & tags.Format<"uuid">,
        name: item.community_name as string,
      },
      score: item.vote_score,
      comment_count: item.comment_count,
      type: item.post_type as "text" | "link" | "image",
      preview: item.content_preview,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      is_active: true,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
