import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFeedCache";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunitiesCommunityIdFeed(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityFeedCache.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortType = props.body.sortType ?? "hot";
  const timeFilter = props.body.timeFilter;
  const skip = (page - 1) * limit;
  // Validate community exists
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: { id: props.communityId, deleted_at: null },
  });
  // Build WHERE conditions
  const whereInput: Prisma.reddit_community_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  // Apply time filter for top sorting
  if (sortType === "top" && timeFilter && timeFilter !== "all") {
    const cutoff = new Date();
    switch (timeFilter) {
      case "today":
        cutoff.setHours(cutoff.getHours() - 24);
        break;
      case "week":
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case "month":
        cutoff.setDate(cutoff.getDate() - 30);
        break;
      case "year":
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        break;
    }
    whereInput.created_at = { gte: cutoff };
  }
  // Build ORDER BY based on sort type
  const orderByInput:
    | Prisma.reddit_community_postsOrderByWithRelationInput[]
    | Prisma.reddit_community_postsOrderByWithRelationInput =
    sortType === "new"
      ? { created_at: "desc" }
      : sortType === "top"
        ? { vote_score: "desc" }
        : sortType === "controversial"
          ? [{ vote_score: "asc" }, { created_at: "asc" }]
          : { created_at: "desc" }; // hot: recent activity
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit + 1,
    select: {
      id: true,
      title: true,
      vote_score: true,
      comment_count: true,
      created_at: true,
      post_type: true,
      author_id: true,
      community_id: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: whereInput,
  });
  const hasMore = data.length > limit;
  const finalData = hasMore ? data.slice(0, limit) : data;
  const transformedData = await ArrayUtil.asyncMap(finalData, async (post) => {
    // Get preview content based on post type (simplified - no related data)
    let previewContent: string | null = null;
    if (post.post_type === "text") {
      previewContent = null; // text body not available in this schema
    } else if (post.post_type === "link") {
      previewContent = null; // link url not available in this schema
    } else if (post.post_type === "image") {
      previewContent = null; // image file not available in this schema
    }
    return {
      id: post.id,
      title: post.title,
      author: {
        id: post.author_id,
        username: "", // username not available without author relation
        created_at: toISOStringSafe(post.created_at),
        profile: undefined,
      } satisfies IRedditCommunityMember.ISummary,
      community: {
        id: post.community_id,
        name: "", // name not available without community relation
        description: "",
        subscriber_count: 0,
        owner: {
          id: "",
          username: "",
          created_at: toISOStringSafe(post.created_at),
          profile: undefined,
        } satisfies IRedditCommunityMember.ISummary,
        created_at: toISOStringSafe(post.created_at),
        updated_at: toISOStringSafe(post.created_at),
        deleted_at: null,
      } satisfies IRedditCommunityCommunity.ISummary,
      vote_score: post.vote_score,
      comment_count: post.comment_count,
      created_at: toISOStringSafe(post.created_at),
      post_type: typia.assert<"text" | "link" | "image">(post.post_type),
      preview_content: previewContent,
    } satisfies IRedditCommunityPost.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityPost.ISummary;
}
