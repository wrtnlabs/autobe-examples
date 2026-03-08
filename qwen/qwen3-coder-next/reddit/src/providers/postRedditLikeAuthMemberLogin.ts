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

export async function postRedditLikeAuthMemberLogin(props: {
  ip: string;
  body: IRedditLikeMember.ILogin;
}): Promise<IRedditLikeMember.IAuthorized> {
  // 1. Find member with password_hash explicitly selected
  const member = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (!member) throw new HttpException("Invalid credentials", 401);
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) throw new HttpException("Invalid credentials", 401);
  // 3. Create new session
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_like_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: member.id,
      access_token: "",
      refresh_token: "",
      access_token_expires_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refresh_token_expires_at: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
      created_at: now.toISOString() as string & tags.Format<"date-time">,
      updated_at: now.toISOString() as string & tags.Format<"date-time">,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      revoked_at: null,
      ip: props.ip,
      user_agent: "",
    },
  });
  // 4. Generate JWT tokens
  const accessPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    created_at: now.toISOString() as string & tags.Format<"date-time">,
  };
  const refreshPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    tokenType: "refresh" as const,
    created_at: now.toISOString() as string & tags.Format<"date-time">,
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Compute statistics
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).toISOString() as string & tags.Format<"date-time">;
  const totalPosts = await MyGlobal.prisma.reddit_like_posts.count();
  const postsToday = await MyGlobal.prisma.reddit_like_posts.count({
    where: {
      created_at: {
        gte: todayStart,
      },
    },
  });
  const totalComments = await MyGlobal.prisma.reddit_like_comments.count();
  const commentsToday = await MyGlobal.prisma.reddit_like_comments.count({
    where: {
      created_at: {
        gte: todayStart,
      },
    },
  });
  const totalVotes = await MyGlobal.prisma.reddit_like_post_votes.count();
  const commentVotesToday =
    await MyGlobal.prisma.reddit_like_comment_votes.count({
      where: {
        created_at: {
          gte: todayStart,
        },
      },
    });
  const totalCommunities =
    await MyGlobal.prisma.reddit_like_communities.count();
  const subscribedCount = await MyGlobal.prisma.reddit_like_subscriptions.count(
    {
      where: { status: "subscribed" },
    },
  );
  const pendingReports = await MyGlobal.prisma.reddit_like_reports.count({
    where: { status: "pending" },
  });
  const activeUsers = await MyGlobal.prisma.reddit_like_posts.count({
    where: {
      created_at: {
        gte: todayStart,
      },
    },
  });
  // 6. Transform member data
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
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? null,
    avatar_url: member.avatar_url ?? null,
    karma_score: member.karma_score,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      (member.deleted_at?.toISOString() as string & tags.Format<"date-time">) ??
      null,
    token,
  } satisfies IRedditLikeMember.IAuthorized;
}
