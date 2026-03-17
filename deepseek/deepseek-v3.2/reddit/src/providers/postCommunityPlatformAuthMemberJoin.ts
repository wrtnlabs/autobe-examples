import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberJoin(props: {
  ip: string;
  body: ICommunityPlatformMember.IJoin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // 1. Check duplicate email and username
  const existingEmail =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  const existingUsername =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 2. Create member record
  const memberId = v4();
  const now = new Date();
  const nowISO = toISOStringSafe(now);
  const member = await MyGlobal.prisma.community_platform_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      nickname: props.body.nickname ?? props.body.username,
      email_verified: false,
      registered_at: nowISO,
      last_login_at: null,
      created_at: nowISO,
      updated_at: nowISO,
      deleted_at: null,
    },
    ...CommunityPlatformMemberTransformer.select(),
  });
  // 3. Create session record
  const sessionId = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessExpiresISO = toISOStringSafe(accessExpires);
  const refreshExpiresISO = toISOStringSafe(refreshExpires);
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.create({
      data: {
        id: sessionId,
        community_platform_member_id: memberId,
        access_token: v4(), // Will be replaced with JWT
        refresh_token: v4(), // Will be replaced with JWT
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowISO,
        updated_at: nowISO,
        expired_at: accessExpiresISO,
      },
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        expired_at: true,
      },
    });
  // 4. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with actual JWT tokens
  await MyGlobal.prisma.community_platform_member_sessions.update({
    where: { id: sessionId },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 5. Transform member data
  const memberData = await CommunityPlatformMemberTransformer.transform(member);
  // 6. Construct IAuthorized response
  return {
    ...memberData,
    bio: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresISO,
      refreshable_until: refreshExpiresISO,
    },
  } satisfies ICommunityPlatformMember.IAuthorized;
}
