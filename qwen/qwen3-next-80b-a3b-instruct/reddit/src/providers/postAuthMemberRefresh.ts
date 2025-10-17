import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberRefresh(props: {
  member: MemberPayload;
  body: ICommunityPlatformMember.IRefresh;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  const { refresh_token } = props.body;

  // Decode and verify refresh token
  let decoded: { session_id: string; exp: number };
  try {
    decoded = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { session_id: string; exp: number };
  } catch (error) {
    throw new HttpException("Invalid refresh token", 401);
  }

  // Validate session exists and is active
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findUnique({
      where: {
        id: decoded.session_id, // Use correct primary key 'id' from schema
      },
    });

  if (!session || !session.is_active) {
    throw new HttpException("Invalid refresh token", 401);
  }

  // Check if session expired
  const sessionExpiry = new Date(session.session_expiry);
  if (sessionExpiry < new Date()) {
    throw new HttpException("Invalid refresh token", 401);
  }

  // Generate new access token (15 minutes)
  const current = Date.now();
  const accessExpires = current + 15 * 60 * 1000;
  const accessToken = jwt.sign(
    {
      member_id: session.member_id, // Use member_id from validated session record
      type: "access",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );

  // Generate new refresh token (7 days)
  const refreshExpires = current + 7 * 24 * 60 * 60 * 1000;
  const newRefreshToken = jwt.sign(
    {
      session_id: session.id, // Store session ID in JWT payload
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Hash the new refresh token before storing
  const hashedRefreshToken = await PasswordUtil.hash(newRefreshToken);

  // Update session with new refresh token hash using session's unique id
  await MyGlobal.prisma.community_platform_user_sessions.update({
    where: {
      id: session.id,
    },
    data: {
      refresh_token_hash: hashedRefreshToken,
      // updated_at: toISOStringSafe(new Date()), // Removed - 'updated_at' does not exist in schema
    },
  });

  // Return the authorized response with properly branded date-times
  return {
    id: session.member_id, // Use member_id from validated session record
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(new Date(accessExpires)),
      refreshable_until: toISOStringSafe(new Date(refreshExpires)),
    },
  };
}
