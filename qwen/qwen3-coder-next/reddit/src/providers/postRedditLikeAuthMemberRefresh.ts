import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function postRedditLikeAuthMemberRefresh(props: {
  body: IRedditLikeMember.IRefresh;
}): Promise<IRedditLikeMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session
  const session = await MyGlobal.prisma.reddit_like_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      expired_at: null,
      revoked_at: null,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member
  const member = await MyGlobal.prisma.reddit_like_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (SAME session_id)
  const nowStr = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const accessExpiresStr = toISOStringSafe(
    new Date(Date.now() + 2 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const refreshExpiresStr = toISOStringSafe(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowStr,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "2h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowStr,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_like_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresStr },
  });
  // 7. Calculate aggregated counts
  const todayStartStr = toISOStringSafe(
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate(),
    ),
  ) as string & tags.Format<"date-time">;
  const totalPosts = await MyGlobal.prisma.reddit_like_posts.count();
  const postsToday = await MyGlobal.prisma.reddit_like_posts.count({
    where: { created_at: { gte: todayStartStr }, deleted_at: null },
  });
  const totalComments = await MyGlobal.prisma.reddit_like_comments.count();
  const commentsToday = await MyGlobal.prisma.reddit_like_comments.count({
    where: { created_at: { gte: todayStartStr }, deleted_at: null },
  });
  const totalPostVotes = await MyGlobal.prisma.reddit_like_post_votes.count();
  const totalCommentVotes =
    await MyGlobal.prisma.reddit_like_comment_votes.count();
  const totalVotes = totalPostVotes + totalCommentVotes;
  const commentVotesToday =
    await MyGlobal.prisma.reddit_like_comment_votes.count({
      where: { created_at: { gte: todayStartStr } },
    });
  const totalCommunities =
    await MyGlobal.prisma.reddit_like_communities.count();
  const subscribedCount = await MyGlobal.prisma.reddit_like_subscriptions.count(
    {
      where: { status: "subscribed", deleted_at: null },
    },
  );
  const pendingReports = await MyGlobal.prisma.reddit_like_reports.count({
    where: { status: "pending", deleted_at: null },
  });
  const activeUsers = await MyGlobal.prisma.reddit_like_posts.findMany({
    where: {
      created_at: { gte: todayStartStr },
      deleted_at: null,
    },
    distinct: ["author_id"],
  });
  // 8. Return result
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
    active_users: activeUsers.length,
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio,
    avatar_url: member.avatar_url,
    karma_score: member.karma_score,
    created_at: toISOStringSafe(member.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(member.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: member.deleted_at
      ? (toISOStringSafe(member.deleted_at) as string &
          tags.Format<"date-time">)
      : null,
    token: {
      access,
      refresh,
      expired_at: accessExpiresStr,
      refreshable_until: refreshExpiresStr,
    },
  };
}
