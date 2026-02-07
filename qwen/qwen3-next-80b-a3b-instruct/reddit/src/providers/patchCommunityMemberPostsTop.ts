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

export async function patchCommunityMemberPostsTop(props: {
  member: MemberPayload;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Filter by time period per specification
  const timePeriod = props.body.timePeriod ?? "allTime";
  let startTime: Date | undefined;
  const now = new Date();
  switch (timePeriod) {
    case "today":
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "thisWeek":
      const day = now.getDay();
      const diff = now.getDate() - day;
      startTime = new Date(now.setDate(diff));
      break;
    case "thisMonth":
      startTime = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "thisYear":
      startTime = new Date(now.getFullYear(), 0, 1);
      break;
    // allTime: no filter
  }
  const whereClause: Prisma.community_mv_community_popular_feedsWhereInput = {
    is_active: true,
    post_type: { in: ["text", "link", "image"] },
  };
  if (startTime) {
    whereClause.created_at = { gte: toISOStringSafe(startTime) };
  }
  const data =
    await MyGlobal.prisma.community_mv_community_popular_feeds.findMany({
      where: whereClause,
      take: limit,
      skip,
      orderBy: { sort_order: "desc" },
    });
  const total =
    await MyGlobal.prisma.community_mv_community_popular_feeds.count({
      where: whereClause,
    });
  // Join with community_posts to validate status = 'approved'
  const postIds = data.map((p) => p.community_post_id);
  const approvedPosts = await MyGlobal.prisma.community_posts.findMany({
    where: {
      id: { in: postIds },
      community_post_status_id: { in: ["approved"] }, // Using 'in' with single value for consistency
    },
    select: { id: true },
  });
  const approvedPostIds = approvedPosts.map((p) => p.id);
  const approvedData = data.filter((p) =>
    approvedPostIds.includes(p.community_post_id),
  );
  // Transform to summary format
  const summaries = approvedData.map((post) => ({
    id: post.community_post_id satisfies string as string & tags.Format<"uuid">,
    title: post.title,
    author_username: post.author_username,
    community_name: post.community_name,
    vote_score: post.vote_score ?? 0,
    comment_count: post.comment_count ?? 0,
    content_preview: post.content_preview || "",
    thumbnail_url: post.thumbnail_url || null,
    domain_name: post.domain_name || null,
    created_at: toISOStringSafe(post.created_at) as string &
      tags.Format<"date-time">, // Convert to proper format using helper
  }));
  return {
    data: summaries,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
