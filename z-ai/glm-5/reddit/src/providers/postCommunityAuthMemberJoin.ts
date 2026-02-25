import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAuthMemberJoin(props: {
  body: ICommunityMember.IJoin;
}): Promise<ICommunityMember.IAuthorized> {
  // 1. Check for duplicate email
  const existingEmail = await MyGlobal.prisma.community_members.findFirst({
    where: {
      email: props.body.email.toLowerCase(),
    },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check for duplicate username
  const existingUsername = await MyGlobal.prisma.community_members.findFirst({
    where: {
      username: {
        equals: props.body.username,
        mode: "insensitive",
      },
    },
  });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Create member record
  const memberId = v4();
  const now = new Date();
  const member = await MyGlobal.prisma.community_members.create({
    data: {
      id: memberId,
      email: props.body.email.toLowerCase(),
      password_hash: passwordHash,
      username: props.body.username,
      display_name: props.body.display_name ?? null,
      bio: null,
      avatar_url: null,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 5. Calculate token expiration times
  const accessExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  // 6. Generate JWT tokens
  const sessionId = v4();
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // 7. Create session record
  await MyGlobal.prisma.community_member_sessions.create({
    data: {
      id: sessionId,
      community_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_expires_at: accessExpiresAt,
      refresh_expires_at: refreshExpiresAt,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      expired_at: refreshExpiresAt,
    },
  });
  // 8. Return IAuthorized response
  return {
    id: member.id,
    username: member.username,
    email: member.email,
    display_name: member.display_name,
    bio: member.bio,
    avatar_url: member.avatar_url,
    karma: member.karma,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    accessToken,
    expiredAt: accessExpiresAt.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    },
  };
}
