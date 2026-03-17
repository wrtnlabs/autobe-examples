import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
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

export async function postCommunityPlatformAuthMemberJoin(props: {
  ip: string;
  body: ICommunityPlatformMember.IJoin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // 1. Check for duplicate email
  const existingEmail =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check for duplicate username
  const existingUsername =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Hash password and create member
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const memberId = v4();
  const now = new Date();
  const member = await MyGlobal.prisma.community_platform_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      display_name: null,
      bio: null,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      karma: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 4. Create session
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.create({
      data: {
        id: sessionId,
        community_platform_member_id: member.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
      select: {
        id: true,
      },
    });
  // 5. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
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
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 6. Return IAuthorized
  return {
    id: member.id,
    username: member.username,
    displayName: member.display_name,
    bio: member.bio,
    karma: member.karma,
    avatar: null,
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    token,
  } satisfies ICommunityPlatformMember.IAuthorized;
}
