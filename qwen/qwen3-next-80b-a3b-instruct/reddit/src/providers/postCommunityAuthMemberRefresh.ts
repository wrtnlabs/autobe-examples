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

export async function postCommunityAuthMemberRefresh(props: {
  body: ICommunityMember.IRefresh;
}): Promise<ICommunityMember.IAuthorized> {
  // Extract refresh token from request body
  const refreshToken = props.body.refreshToken;
  if (!refreshToken) {
    throw new HttpException("Invalid or missing refresh token", 401);
  }
  // Verify refresh token signature and decode
  let decoded: {
    id: string;
    session_id: string;
  };
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate that the decoded token has required properties
  if (!decoded.id || !decoded.session_id) {
    throw new HttpException("Invalid token payload", 401);
  }
  // Validate session exists and is active
  const session = await MyGlobal.prisma.community_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      community_member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate member is not deleted
  const member = await MyGlobal.prisma.community_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Generate new access token (30 minutes)
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // Update session with new refresh token and expiration
  await MyGlobal.prisma.community_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      refresh_token: newRefreshToken,
      expired_at: toISOStringSafe(refreshExpires),
    },
  });
  // Update member's updated_at timestamp
  await MyGlobal.prisma.community_members.update({
    where: { id: decoded.id },
    data: { updated_at: toISOStringSafe(new Date()) },
  });
  // Log audit event
  await MyGlobal.prisma.community_audit_logs.create({
    data: {
      id: v4(),
      action_type: "refresh_token_issued",
      moderator_id: decoded.id,
      target_id: decoded.session_id,
      target_type: "session",
      description: "Member refreshed access tokens",
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return authorized response with new tokens
  return {
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
