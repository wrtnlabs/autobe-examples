import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostAtSummaryTransformer } from "../transformers/RedditPlatformPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberFeedsCommunityCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditPlatformPost.IFeedRequest;
}): Promise<IPageIRedditPlatformPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortType = props.body.sortType ?? "HOT";
  const timeRange = props.body.timeRange ?? "ALL";
  const skip = (page - 1) * limit;
  // Step 1: Validate community exists and is not soft-deleted
  const community = await MyGlobal.prisma.reddit_platform_communities.findFirst(
    {
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    },
  );
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Step 2: Check if member is banned from community
  const banRecord =
    await MyGlobal.prisma.reddit_platform_community_bans.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.member.id,
        deleted_at: null,
      },
    });
  // Check ban expiration
  const isBanned =
    banRecord !== null &&
    (banRecord.expires_at === null || banRecord.expires_at > new Date());
  if (isBanned) {
    throw new HttpException("You are banned from this community", 403);
  }
  // Build WHERE clause
  const whereInput: Prisma.reddit_platform_postsWhereInput = {
    reddit_platform_community_id: props.communityId,
    deleted_at: null,
    ...(sortType === "TOP" &&
      timeRange !== "ALL" && {
        created_at: {
          gte: (() => {
            const now = new Date();
            switch (timeRange) {
              case "TODAY":
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
              case "WEEK":
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              case "MONTH":
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              case "YEAR":
                return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
              default:
                return new Date();
            }
          })(),
        },
      }),
  } satisfies Prisma.reddit_platform_postsWhereInput;
  // Build ORDER BY based on sortType
  const orderByInput = (() => {
    switch (sortType) {
      case "NEW":
        return [
          { created_at: "desc" },
        ] satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[];
      case "TOP":
        return [
          { vote_score: "desc" },
        ] satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[];
      case "CONTROVERSIAL":
        // Order by vote_score near zero (absolute value)
        return [
          { vote_score: "asc" },
        ] satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[];
      case "HOT":
      default:
        // Time-weighted: vote_score DESC, then created_at DESC
        return [
          { vote_score: "desc" },
          { created_at: "desc" },
        ] satisfies Prisma.reddit_platform_postsOrderByWithRelationInput[];
    }
  })();
  // Step 3: Query posts with author and community joins
  const data = await MyGlobal.prisma.reddit_platform_posts.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditPlatformPostAtSummaryTransformer.select(),
  });
  // Step 4: Get total count
  const total = await MyGlobal.prisma.reddit_platform_posts.count({
    where: whereInput,
  });
  // Step 5: Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditPlatformPostAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIRedditPlatformPost.ISummary;
}
