import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeMember> {
  const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: props.userId },
  });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = toISOStringSafe(today);
  const totalPosts = await MyGlobal.prisma.reddit_like_posts.count({
    where: { author_id: props.userId, deleted_at: null },
  });
  const postsToday = await MyGlobal.prisma.reddit_like_posts.count({
    where: {
      author_id: props.userId,
      created_at: { gte: new Date(today) },
      deleted_at: null,
    },
  });
  const totalComments = await MyGlobal.prisma.reddit_like_comments.count({
    where: { author_id: props.userId, deleted_at: null },
  });
  const commentsToday = await MyGlobal.prisma.reddit_like_comments.count({
    where: {
      author_id: props.userId,
      created_at: { gte: new Date(today) },
      deleted_at: null,
    },
  });
  const totalVotes = await Promise.all([
    MyGlobal.prisma.reddit_like_post_votes.count({
      where: { voter_id: props.userId },
    }),
    MyGlobal.prisma.reddit_like_comment_votes.count({
      where: { reddit_like_member_id: props.userId },
    }),
  ]).then(([postVotes, commentVotes]) => postVotes + commentVotes);
  const commentVotesToday =
    await MyGlobal.prisma.reddit_like_comment_votes.count({
      where: {
        reddit_like_member_id: props.userId,
        created_at: { gte: new Date(today) },
      },
    });
  const totalCommunities =
    await MyGlobal.prisma.reddit_like_communities.count();
  const subscribedCount = await MyGlobal.prisma.reddit_like_subscriptions.count(
    {
      where: { reddit_like_member_id: props.userId, status: "subscribed" },
    },
  );
  const pendingReports = await MyGlobal.prisma.reddit_like_reports.count({
    where: { status: "pending" },
  });
  const activeUsers = await MyGlobal.prisma.reddit_like_posts.count({
    where: { created_at: { gte: new Date(today) }, deleted_at: null },
  });
  return {
    total_posts: totalPosts,
    posts_today: postsToday,
    total_comments: totalComments,
    comments_today: commentsToday,
    total_votes: totalVotes,
    comment_votes_today: commentVotesToday,
    total_communities: totalCommunities,
    subscribed_count: subscribedCount,
    pending_reports: pendingReports,
    active_users: activeUsers,
  } satisfies IRedditLikeMember;
}
