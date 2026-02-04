import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

export async function postCommunityPlatformAuthMemberJoin(props: {
  body: ICommunityPlatformMember.IJoin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // Verify email uniqueness
  const existing = await MyGlobal.prisma.community_platform_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password using PasswordUtil.hash() - no collector exists for ICommunityPlatformMember.IJoin
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create member record with exact field names from schema: email, password_hash, created_at
  const member = await MyGlobal.prisma.community_platform_members.create({
    data: {
      email: props.body.email,
      password_hash: passwordHash,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      id: v4(),
      username: "",
      karma: 0,
    },
  });
  // Create session record
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.create({
      data: {
        id: v4(),
        member_id: member.id,
        created_at: toISOStringSafe(new Date()),
        expired_at: accessExpires,
        ip: "127.0.0.1",
        href: "",
        referrer: "",
      },
    });
  // Generate JWT tokens with EXACT payload structure
  const access_token = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh_token = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // Return ICommunityPlatformMember.IAuthorized structure
  // Note: According to ICommunityPlatformMember.IAuthorized, these fields are computed from profile_metadata_service
  // and we just created them, so they're available immediately
  return {
    member_id: member.id,
    username: "", // Default value as profile creation is removed
    display_name: "", // Default value as profile creation is removed
    bio: undefined, // Default value as profile creation is removed
    avatar_url: undefined, // Default value as profile creation is removed
    karma: 0, // Default karma for new member
    access_token,
    refresh_token,
    token: {
      access: access_token,
      refresh: refresh_token,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  } satisfies ICommunityPlatformMember.IAuthorized;
}
