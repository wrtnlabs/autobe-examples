import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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
  body: IRedditPlatformMember.IJoin;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Check for duplicate email
  const existingMember =
    await MyGlobal.prisma.reddit_platform_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingMember) throw new HttpException("Email already registered", 409);
  // 2. Create member with hashed password
  const now = new Date();
  const nowIso = toISOStringSafe(now);
  const created = await MyGlobal.prisma.reddit_platform_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      email_verified: false,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.displayName ?? null,
      bio: null,
      avatar_url: null,
      karma_score: 0,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      email_verified: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create email verification token
  const verificationToken = v4();
  const verificationExpires = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.reddit_platform_member_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_platform_member_id: created.id,
      token: verificationToken,
      expires_at: verificationExpires,
      verified_at: null,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });
  // 4. Create session records for access and refresh tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const sessionId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.reddit_platform_member_sessions.create({
    data: {
      id: sessionId,
      member_id: created.id,
      ip: "0.0.0.0",
      href: "/redditPlatform/auth/member/join",
      referrer: "",
      created_at: toISOStringSafe(now),
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  // 5. Generate JWT tokens
  const nowDateString = new Date().toISOString();
  const accessToken = jwt.sign(
    {
      type: "member",
      id: created.id,
      session_id: sessionId,
      created_at: nowDateString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: created.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowDateString,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return member with token
  return {
    id: created.id,
    email: created.email,
    email_verified: created.email_verified,
    username: created.username,
    display_name: created.display_name,
    bio: created.bio,
    avatar_url: created.avatar_url,
    karma_score: created.karma_score,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
