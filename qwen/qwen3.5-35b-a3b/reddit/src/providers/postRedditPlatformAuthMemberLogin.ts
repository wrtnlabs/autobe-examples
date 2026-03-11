import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthMemberLogin(props: {
  ip: string;
  body: IRedditPlatformMember.ILogin;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.reddit_platform_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      password_hash: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      sessions: {
        select: {
          id: true,
          created_at: true,
        },
      },
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // Verify account is active and not deleted
  if (!member.is_active || member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password using PasswordUtil.verify
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Enforce max 5 concurrent sessions limit
  const MAX_SESSIONS = 5;
  const existingSessions = member.sessions;
  if (existingSessions.length >= MAX_SESSIONS) {
    // Find oldest session by created_at and invalidate it
    const sortedSessions = [...existingSessions].sort(
      (a, b) => a.created_at.getTime() - b.created_at.getTime(),
    );
    if (sortedSessions.length > 0) {
      await MyGlobal.prisma.reddit_platform_member_sessions.update({
        where: { id: sortedSessions[0].id },
        data: {
          expired_at: new Date(),
        },
      });
    }
  }
  // 4. Create new session with 2-hour expiration
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_platform_member_sessions.create({
    data: {
      id: v4(),
      member_id: member.id,
      ip: props.ip,
      href: null,
      referrer: null,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const tokenPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    created_at: now.toISOString(),
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "2h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Return IAuthorized pattern
  return {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? null,
    avatar_url: member.avatar_url ?? null,
    karma_score: Number(member.karma_score),
    is_active: member.is_active,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    sessions: [],
    posts: [],
    comments: [],
    postVotes: [],
    commentVotes: [],
    reports: [],
    access: token.access,
    refresh: token.refresh,
    expired_at: token.expired_at,
    user: {
      id: member.id,
      username: member.username,
      display_name: member.display_name,
      karma_score: Number(member.karma_score),
      is_active: member.is_active,
      created_at: toISOStringSafe(member.created_at),
    },
    token,
  };
}
