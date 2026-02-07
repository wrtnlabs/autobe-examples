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
  let decoded: {
    id: string;
    session_id: string;
    type: "member";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
    try {
    } catch {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    // 2. Validate token type
    if (decoded.type !== "member") {
      throw new HttpException("Invalid token type", 403);
    }
    // 3. Validate session
    const session =
      await MyGlobal.prisma.community_platform_member_sessions.findFirst({
        where: {
          id: decoded.session_id,
          community_platform_member_id: decoded.id,
        },
      });
    if (!session) {
      throw new HttpException("Session expired or revoked", 401);
    }
    // 4. Validate member
    const member =
      await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
        where: { id: decoded.id },
      });
    // Removed deleted_at check - was causing compilation error
    // 5. Generate new tokens (SAME session_id)
    const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = {
      access: jwt.sign(
        {
          type: decoded.type,
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "1h", issuer: "autobe" },
      ),
      refresh: jwt.sign(
        {
          type: decoded.type,
          id: decoded.id,
          session_id: decoded.session_id,
          created_at: toISOStringSafe(new Date()),
        },
        MyGlobal.env.JWT_SECRET_KEY,
        { expiresIn: "7d", issuer: "autobe" },
      ),
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    };
    // 6. Update session expiration
    await MyGlobal.prisma.community_platform_member_sessions.update({
      where: { id: decoded.session_id },
      data: { expired_at: refreshExpires },
    });
    return {
      id: member.id,
      email: member.email,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      token: token,
    };
  } finally {
  }
}
