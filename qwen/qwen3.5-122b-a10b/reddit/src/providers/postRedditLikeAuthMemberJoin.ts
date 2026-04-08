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

export async function postRedditLikeAuthMemberJoin(props: {
  ip: string;
  body: IRedditLikeMember.IJoin;
}): Promise<IRedditLikeMember.IAuthorized> {
  // 1. Check duplicate email
  const existingEmail = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check duplicate username
  const existingUsername = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: { username: props.body.username, deleted_at: null },
  });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Generate UUIDs (v4() already returns valid UUID string)
  const memberId = v4();
  const profileId = v4();
  const sessionId = v4();
  // 5. Create timestamps
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 6. Create member record
  const member = await MyGlobal.prisma.reddit_like_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      username: props.body.username,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 7. Create profile record
  const profile = await MyGlobal.prisma.reddit_like_user_profiles.create({
    data: {
      id: profileId,
      reddit_like_member_id: member.id,
      display_name: props.body.username,
      bio: null,
      avatar: null,
      karma_score: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 8. Create session record
  const session = await MyGlobal.prisma.reddit_like_member_sessions.create({
    data: {
      id: sessionId,
      reddit_like_member_id: member.id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 9. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
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
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 10. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name: profile.display_name,
    bio: profile.bio,
    avatar: profile.avatar,
    karma_score: profile.karma_score,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token,
  } satisfies IRedditLikeMember.IAuthorized;
}
