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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberPostsHot(props: {
  member: MemberPayload;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const limit = 20; // 20 posts per page as specified
  // Query the materialized view with 'hot' sort_algorithm
  const data =
    await MyGlobal.prisma.community_mv_community_popular_feeds.findMany({
      where: {
        sort_algorithm: "hot",
      },
      take: limit,
      orderBy: { sort_order: "desc" },
      select: {
        community_post_id: true,
        sort_order: true,
        title: true,
        author_username: true,
        community_name: true,
        vote_score: true,
        comment_count: true,
        post_type: true,
        content_preview: true,
        created_at: true,
      },
    });
  // Count total records for pagination info
  const total =
    await MyGlobal.prisma.community_mv_community_popular_feeds.count({
      where: { sort_algorithm: "hot" },
    });
  // Transform data to match ICommunityPost.ISummary structure
  // According to schema, ICommunityPost.ISummary is an empty object {}
  // So we return empty objects for each item
  const transformedData = data.map(() => ({}));
  // Calculate pagination info
  const currentPage = 1; // This is a placeholder - cursor-based pagination ignores page number
  const totalPages = Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: totalPages,
    },
  };
}
