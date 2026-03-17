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
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { CommunityPlatformMemberTransformer } from "../transformers/CommunityPlatformMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberRefresh(props: {
  body: ICommunityPlatformMember.IRefresh;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // 1. Verify refresh token exists in session table
  const now = new Date();
  const nowISO = now.toISOString();
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.findFirst({
      where: {
        refresh_token: props.body.refresh_token,
        expired_at: { gt: now },
      },
      select: {
        id: true,
        community_platform_member_id: true,
        access_token: true,
        refresh_token: true,
        expired_at: true,
      },
    });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Verify JWT token
  let decoded: {
    id: string;
    session_id: string;
    type: "member";
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 3. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 4. Validate session matches token
  if (
    session.id !== decoded.session_id ||
    session.community_platform_member_id !== decoded.id
  ) {
    throw new HttpException("Session mismatch", 401);
  }
  // 5. Validate member exists and not deleted
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: decoded.id },
      ...CommunityPlatformMemberTransformer.select(),
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens (same session_id)
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const tokenPayload = {
    type: "member" as const,
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: nowISO,
  };
  const newAccessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const newRefreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens
  await MyGlobal.prisma.community_platform_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
      updated_at: now,
    },
  });
  // 8. Transform member data
  const transformedMember =
    await CommunityPlatformMemberTransformer.transform(member);
  // 9. Get avatar file if exists
  const avatarFile = await MyGlobal.prisma.community_platform_files.findFirst({
    where: {
      actor_type: "member",
      actor_id: decoded.id,
      deleted_at: null,
      type: { startsWith: "image/" },
    },
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      public_url: true,
      status: true,
      actor_type: true,
      actor_id: true,
      created_at: true,
      deleted_at: true,
    },
  });
  // Get member summary for avatar actor
  const memberSummary =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: decoded.id },
      ...CommunityPlatformMemberAtSummaryTransformer.select(),
    });
  const transformedMemberSummary =
    await CommunityPlatformMemberAtSummaryTransformer.transform(memberSummary);
  const avatarSummary: ICommunityPlatformFile.ISummary | null = avatarFile
    ? {
        id: avatarFile.id as string & tags.Format<"uuid">,
        name: avatarFile.name,
        type: avatarFile.type,
        size: avatarFile.size,
        public_url: avatarFile.public_url as
          | (string & tags.Format<"uri">)
          | null,
        status: avatarFile.status,
        actor: transformedMemberSummary,
        created_at: avatarFile.created_at.toISOString(),
        deleted_at: avatarFile.deleted_at?.toISOString() ?? null,
      }
    : null;
  // 10. Assemble final response
  return {
    id: transformedMember.id,
    username: transformedMember.username,
    nickname: transformedMember.nickname,
    email: transformedMember.email,
    email_verified: transformedMember.email_verified,
    registered_at: transformedMember.registered_at,
    last_login_at: transformedMember.last_login_at,
    created_at: transformedMember.created_at,
    updated_at: transformedMember.updated_at,
    avatar: avatarSummary,
    karma: transformedMember.karma,
    posts: transformedMember.posts,
    comments: transformedMember.comments,
    bio: null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
