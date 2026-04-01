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
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunitiesCommunityIdFeed(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityFeedCache.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate sortType
  const sortType = (props.body.sortType ?? "hot") as
    | "hot"
    | "new"
    | "top"
    | "controversial";
  const timeFilter = (props.body.timeFilter ?? "all") as
    | "today"
    | "week"
    | "month"
    | "year"
    | "all";
  // Validate community exists
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Get total count
  const total = await MyGlobal.prisma.reddit_community_posts.count({
    where: { community_id: props.communityId, deleted_at: null },
  });
  // Apply time filter if top sorting
  let whereClause: Prisma.reddit_community_postsWhereInput = {
    community_id: props.communityId,
    deleted_at: null,
  };
  if (sortType === "top" && timeFilter !== "all") {
    const now = new Date();
    let cutoffDate: Date;
    switch (timeFilter) {
      case "today":
        cutoffDate = new Date();
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case "month":
        cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      case "year":
        cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
      default:
        cutoffDate = new Date(0);
    }
    whereClause = {
      community_id: props.communityId,
      deleted_at: null,
      created_at: { gte: cutoffDate },
    };
  }
  // Build orderBy based on sortType
  const orderBy: Prisma.reddit_community_postsOrderByWithRelationInput[] =
    sortType === "controversial"
      ? [{ vote_score: "asc" }, { vote_score: "desc" }]
      : sortType === "hot"
        ? [{ vote_score: "desc" }, { created_at: "desc" }]
        : sortType === "top"
          ? [{ vote_score: "desc" }]
          : [{ created_at: "desc" }];
  // Fetch posts
  const posts = await MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereClause,
    orderBy,
    skip,
    take: limit,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  // Transform posts
  const data = await ArrayUtil.asyncMap(
    posts,
    RedditCommunityPostAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
