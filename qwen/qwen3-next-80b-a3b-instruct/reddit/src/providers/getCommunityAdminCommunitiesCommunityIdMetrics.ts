import { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminCommunitiesCommunityIdMetrics(props: {
  admin: AdminPayload;
  communityId: string;
}): Promise<ICommunityUsageMetric> {
  // Verify community exists
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: props.communityId },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Count active subscribers using direct join
  const subscriberCount = await MyGlobal.prisma.community_subscriptions.count({
    where: { community_community_id: props.communityId },
  });
  // Count non-deleted posts
  const postCount = await MyGlobal.prisma.community_posts.count({
    where: { community_id: props.communityId, deleted_at: null },
  });
  // Count non-deleted comments on posts in this community using JOIN
  const commentCount = await MyGlobal.prisma.community_comments.count({
    where: {
      community_post_id: props.communityId,
      deleted_at: null,
    },
  });
  // Count all votes on posts in this community using JOIN
  const voteCount = await MyGlobal.prisma.community_post_votes.count({
    where: {
      post: { community_id: props.communityId },
    },
  });
  return {
    total_users: subscriberCount,
    posts_created: postCount,
    comments_created: commentCount,
    votes_cast: voteCount,
    active_sessions: 0,
    communities_created: 0,
    reports_submitted: 0,
    avg_posts_per_user: 0,
    avg_comments_per_user: 0,
    avg_votes_per_post: 0,
    avg_votes_per_comment: 0,
    avg_session_duration: 0,
    active_community_count: 0,
  };
}
