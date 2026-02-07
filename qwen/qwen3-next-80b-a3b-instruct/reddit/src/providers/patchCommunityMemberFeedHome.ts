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

export async function patchCommunityMemberFeedHome(props: {
  member: MemberPayload;
  body: ICommunityPost.IRequest;
}): Promise<IPageICommunityPost.ISummary> {
  const limit = 100; // Fixed limit, since IRequest has no limit field
  const cursor = null; // No cursor in IRequest
  // Fetch feed entries from materialized view using default page and limit, including vote_score as sort_order
  const data = await MyGlobal.prisma.community_mv_community_home_feeds.findMany(
    {
      orderBy: { sort_order: "desc" },
      take: limit + 1,
      select: {
        post_id: true,
        sort_order: true, // This is the vote_score
      },
    },
  );
  const hasNextPage = data.length > limit;
  const trimmedData = data.slice(0, limit);
  const nextCursor = hasNextPage
    ? trimmedData[trimmedData.length - 1].sort_order.toString()
    : null;
  // Extract post IDs for fetching full post data
  const postIds = trimmedData.map((item) => item.post_id);
  // Fetch posts with all required relationships using CORRECT relation names from schema
  const posts = await MyGlobal.prisma.community_posts.findMany({
    where: { id: { in: postIds }, deleted_at: null },
    select: {
      id: true,
      title: true,
      content_type: true,
      created_at: true,
      updated_at: true,
      author: { select: { id: true, display_name: true, avatar_url: true } },
      community: { select: { id: true, name: true, icon_url: true } },
      status: { select: { status: true } },
      text: { select: { content: true } },
      postLink: { select: { domain_name: true } },
      commentCount: { select: { comment_count: true } },
    },
  });
  // Transform each post into ICommunityPost.ISummary using correct relation names
  const transformedContent = posts.map((post) => {
    const match = trimmedData.find((item) => item.post_id === post.id);
    const voteScore = match ? match.sort_order : 0;
    const textContent = post.text?.content || "";
    const domain = post.postLink?.domain_name || "";
    const preview =
      post.content_type === "text"
        ? textContent.substring(0, 100)
        : post.content_type === "link"
          ? domain
          : "";
    return {
      id: post.id,
      title: post.title,
      author: {
        id: post.author.id,
        display_name: post.author.display_name,
        avatar_url: post.author.avatar_url || null,
      },
      community: {
        id: post.community.id,
        name: post.community.name,
        icon_url: post.community.icon_url || null,
      },
      content_type: post.content_type,
      score: voteScore, // Use the actual vote_score from materialized view
      comment_count: post.commentCount?.comment_count || 0,
      created_at: toISOStringSafe(post.created_at),
      updated_at: toISOStringSafe(post.updated_at),
      preview: preview || null,
      status: post.status.status,
    };
  });
  return {
    data: transformedContent,
    pagination: {
      current: 1,
      limit,
      records: posts.length,
      pages: Math.ceil(posts.length / limit),
    } satisfies IPage.IPagination,
  };
}
