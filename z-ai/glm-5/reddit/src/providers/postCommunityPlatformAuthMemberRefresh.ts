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
  // 1. Verify refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type and structure without type assertions
  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Invalid token format", 403);
  }
  const tokenPayload = decoded;
  if (
    !("type" in tokenPayload) ||
    tokenPayload.type !== "member" ||
    !("id" in tokenPayload) ||
    typeof tokenPayload.id !== "string" ||
    !("session_id" in tokenPayload) ||
    typeof tokenPayload.session_id !== "string"
  ) {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.findFirst({
      where: {
        id: tokenPayload.session_id,
        community_platform_member_id: tokenPayload.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member exists and not deleted with single query
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: tokenPayload.id },
    select: {
      id: true,
      username: true,
      display_name: true,
      bio: true,
      karma: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Account not found", 404);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: tokenPayload.id,
      session_id: tokenPayload.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: tokenPayload.id,
      session_id: tokenPayload.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.community_platform_member_sessions.update({
    where: { id: tokenPayload.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return IAuthorized with member data and tokens
  return {
    id: member.id,
    username: member.username,
    displayName: member.display_name ?? null,
    bio: member.bio ?? null,
    karma: member.karma,
    avatar: null,
    createdAt: member.created_at.toISOString(),
    updatedAt: member.updated_at.toISOString(),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
