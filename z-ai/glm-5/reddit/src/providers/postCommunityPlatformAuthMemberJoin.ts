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
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberJoin(props: {
  body: ICommunityPlatformMember.IJoin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // 1. Check for existing email (generic error to prevent enumeration)
  const existingEmail =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: { email: props.body.email.toLowerCase() },
    });
  if (existingEmail) {
    throw new HttpException("Unable to create account", 409);
  }
  // 2. Check for existing username
  const existingUsername =
    await MyGlobal.prisma.community_platform_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 4. Create member record
  const now = new Date();
  const member = await MyGlobal.prisma.community_platform_members.create({
    data: {
      id: v4(),
      email: props.body.email.toLowerCase(),
      username: props.body.username,
      password_hash: passwordHash,
      display_name: props.body.displayName ?? props.body.username,
      bio: props.body.bio ?? null,
      avatar_url: props.body.avatarUrl ?? null,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...CommunityPlatformMemberTransformer.select(),
  });
  // 5. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.create({
      data: {
        id: v4(),
        community_platform_member_id: member.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer ?? null,
        user_agent: null,
        created_at: now,
        expired_at: accessExpires,
        deleted_at: null,
      },
    });
  // 6. Generate JWT tokens
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
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 7. Fetch member summary
  const memberSummary =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: member.id },
      ...CommunityPlatformMemberAtSummaryTransformer.select(),
    });
  // 8. Return IAuthorized
  return {
    ...(await CommunityPlatformMemberTransformer.transform(member)),
    token,
    member:
      await CommunityPlatformMemberAtSummaryTransformer.transform(
        memberSummary,
      ),
  } satisfies ICommunityPlatformMember.IAuthorized;
}
