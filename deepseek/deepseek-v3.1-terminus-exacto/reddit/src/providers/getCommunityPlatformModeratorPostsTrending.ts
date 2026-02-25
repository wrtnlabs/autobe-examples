import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorPostsTrending(props: {
  moderator: ModeratorPayload;
}): Promise<IPageICommunityPlatformPost> {
  // Verify moderator is active
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUniqueOrThrow({
      where: { id: props.moderator.id, deleted_at: null, is_active: true },
    });
  // Default pagination
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  // Get current time as ISO string for timestamp calculations
  const nowISO = toISOStringSafe(new Date());
  const cutoffHours = 168; // 1 week cutoff
  const cutoffTime = toISOStringSafe(
    new Date(Date.now() - cutoffHours * 60 * 60 * 1000),
  );
  // Query posts with proper relation selection
  const postsRaw = await MyGlobal.prisma.community_platform_posts.findMany({
    where: {
      deleted_at: null,
      created_at: { gte: cutoffTime },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          karma: true,
          created_at: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
              karma: true,
              created_at: true,
            },
          },
        },
      },
      voteScore: {
        select: {
          upvote_count: true,
          downvote_count: true,
          total_score: true,
          last_updated_at: true,
        },
      },
      comments: {
        where: { deleted_at: null },
        select: { id: true },
      },
    },
    skip,
    take: limit,
  });
  // Calculate trending scores and sort
  const postsWithScores = postsRaw
    .map((post) => {
      const voteScore = post.voteScore;
      const hoursSince = Math.max(
        1,
        (new Date(nowISO).getTime() - new Date(post.created_at).getTime()) /
          (1000 * 60 * 60),
      );
      const score = voteScore ? voteScore.total_score : 0;
      const commentCount = post.comments.length;
      const trendScore =
        (score * Math.log(commentCount + 1)) / (hoursSince + 2);
      return { post, trendScore };
    })
    .sort((a, b) => b.trendScore - a.trendScore);
  // Transform posts using the proper structure
  const transformedPosts = await Promise.all(
    postsWithScores.map(({ post }) => {
      // Create a properly structured object that matches the transformer's expected input
      const transformedData = {
        ...post,
        votes: [],
        auditLogs: [],
        snapshots: [],
        moderationAuditLogs: [],
        moderationActionLogs: [],
        activities: [],
        voteRateLimits: [],
        votingTransactions: [],
        systemNotificationPosts: [],
        moderationQueues: [],
        textContent: null,
        linkContent: null,
        imageContent: null,
        postImage: null,
        postViews: [],
        favoritedByUsers: [],
        voteScore: post.voteScore ? { id: "temp-vote-score-id" } : null,
      };
      return CommunityPlatformPostTransformer.transform(transformedData);
    }),
  );
  const total = await MyGlobal.prisma.community_platform_posts.count({
    where: { deleted_at: null, created_at: { gte: cutoffTime } },
  });
  return {
    data: transformedPosts,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
