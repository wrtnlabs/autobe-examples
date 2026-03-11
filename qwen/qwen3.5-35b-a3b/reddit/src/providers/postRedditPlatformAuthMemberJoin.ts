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

export async function postRedditPlatformAuthMemberJoin(props: {
  ip: string;
  body: IRedditPlatformMember.IJoin;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Check email uniqueness
  const existingEmail =
    await MyGlobal.prisma.reddit_platform_members.findUnique({
      where: { email: props.body.email },
    });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check username uniqueness
  const existingUsername =
    await MyGlobal.prisma.reddit_platform_members.findUnique({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Create member actor
  const member = await MyGlobal.prisma.reddit_platform_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      username: props.body.username,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.displayName ?? props.body.username,
      bio: props.body.bio,
      avatar_url: props.body.avatarUrl,
      karma_score: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 4. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_platform_member_sessions.create({
    data: {
      id: v4(),
      member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
    select: {
      id: true,
      member_id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
  });
  // 5. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Build and return IAuthorized response
  const authorizedMember: IRedditPlatformMember.IAuthorized = {
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    bio: member.bio ?? null,
    avatar_url: member.avatar_url ?? null,
    karma_score: member.karma_score,
    is_active: member.is_active,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
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
      karma_score: member.karma_score,
      is_active: member.is_active,
      created_at: member.created_at.toISOString(),
    },
    token,
  };
  return authorizedMember;
}
