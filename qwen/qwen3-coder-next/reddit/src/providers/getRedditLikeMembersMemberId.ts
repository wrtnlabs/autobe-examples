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

export async function getRedditLikeMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IRedditLikeMember> {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  // Fetch individual metrics sequentially
  const posts = await MyGlobal.prisma.reddit_like_posts.aggregate({
    where: { author_id: props.memberId, deleted_at: null },
    _count: true,
  });
  const postsToday = await MyGlobal.prisma.reddit_like_posts.aggregate({
    where: {
      author_id: props.memberId,
      deleted_at: null,
      created_at: { gte: todayStart },
    },
    _count: true,
  });
  const comments = await MyGlobal.prisma.reddit_like_comments.aggregate({
    where: { author_id: props.memberId, deleted_at: null },
    _count: true,
  });
  const commentsToday = await MyGlobal.prisma.reddit_like_comments.aggregate({
    where: {
      author_id: props.memberId,
      deleted_at: null,
      created_at: { gte: todayStart },
    },
    _count: true,
  });
  const postVotes = await MyGlobal.prisma.reddit_like_post_votes.aggregate({
    where: { voter_id: props.memberId },
    _count: true,
  });
  const commentVotes =
    await MyGlobal.prisma.reddit_like_comment_votes.aggregate({
      where: { reddit_like_member_id: props.memberId },
      _count: true,
    });
  const commentVotesToday =
    await MyGlobal.prisma.reddit_like_comment_votes.aggregate({
      where: {
        reddit_like_member_id: props.memberId,
        created_at: { gte: todayStart },
      },
      _count: true,
    });
  const communities = await MyGlobal.prisma.reddit_like_communities.aggregate({
    _count: true,
  });
  const subscriptions =
    await MyGlobal.prisma.reddit_like_subscriptions.aggregate({
      where: {
        reddit_like_member_id: props.memberId,
        status: "subscribed",
      },
      _count: true,
    });
  const reports = await MyGlobal.prisma.reddit_like_reports.aggregate({
    where: {
      reporter_id: props.memberId,
      status: "pending",
    },
    _count: true,
  });
  const activeUsers = await MyGlobal.prisma.reddit_like_posts.aggregate({
    where: {
      created_at: { gte: todayStart },
    },
    _count: true,
  });
  return {
    total_posts: posts._count ?? 0,
    posts_today: postsToday._count ?? 0,
    total_comments: comments._count ?? 0,
    comments_today: commentsToday._count ?? 0,
    total_votes: (postVotes._count ?? 0) + (commentVotes._count ?? 0),
    comment_votes_today: commentVotesToday._count ?? 0,
    total_communities: communities._count ?? 0,
    subscribed_count: subscriptions._count ?? 0,
    pending_reports: reports._count ?? 0,
    active_users: activeUsers._count ?? 0,
  };
}
