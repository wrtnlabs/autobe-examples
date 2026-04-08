import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthMemberJoin(props: {
  ip: string;
  body: IRedditCloneMember.IJoin;
}): Promise<IRedditCloneMember.IAuthorized> {
  // 1. Check if email already exists
  const existingEmail = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check if username already exists
  const existingUsername = await MyGlobal.prisma.reddit_clone_members.findFirst(
    {
      where: {
        username: props.body.username,
        deleted_at: null,
      },
    },
  );
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Create member record
  const now = new Date();
  const member = await MyGlobal.prisma.reddit_clone_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create user profile
  const profile = await MyGlobal.prisma.reddit_clone_user_profiles.create({
    data: {
      id: v4(),
      reddit_clone_member_id: member.id,
      display_name: props.body.username,
      bio: null,
      avatar: null,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 6. Calculate expiration dates
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 7. Create session record first to get session ID
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: v4(),
      reddit_clone_member_id: member.id,
      access_token: "placeholder",
      refresh_token: "placeholder",
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
      deleted_at: null,
    },
  });
  // 8. Generate JWT tokens with actual session ID
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Update session with actual tokens
  await MyGlobal.prisma.reddit_clone_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 10. Return IAuthorized response
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    display_name: profile.display_name,
    bio: profile.bio,
    avatar: profile.avatar,
    karma: profile.karma,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
