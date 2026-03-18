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

export async function postCommunityPlatformAuthMemberRefresh(props: {
  body: ICommunityPlatformMember.IRefresh;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const verified: unknown = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  if (typeof verified !== "object" || verified === null) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const token = verified as Record<string, unknown>;
  if (
    token.type !== "member" ||
    typeof token.id !== "string" ||
    typeof token.session_id !== "string" ||
    typeof token.created_at !== "string"
  ) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.findUniqueOrThrow({
      where: { id: token.session_id },
      select: {
        id: true,
        community_platform_member_id: true,
        expired_at: true,
      },
    });
  if (session.community_platform_member_id !== token.id) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: token.id },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_image_uri: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (member.deleted_at !== null)
    throw new HttpException("Account has been deleted", 403);
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const issuedAt = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: issuedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.community_platform_member_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: new Date(refreshExpiredAt),
    },
  });
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    displayName: member.display_name,
    bio: member.bio,
    avatarImageUri: member.avatar_image_uri,
    karma: member.karma,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
