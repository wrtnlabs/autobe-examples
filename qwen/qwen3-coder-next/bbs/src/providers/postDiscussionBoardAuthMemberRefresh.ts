import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function postDiscussionBoardAuthMemberRefresh(props: {
  body: IDiscussionBoardMember.IRefresh;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // Verify refresh token
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
  // Validate type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // Get current time as proper ISO string
  const nowIso = toISOStringSafe(new Date());
  // Validate session
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_member_id: decoded.id,
        invalidated_at: null,
        expired_at: { gte: nowIso },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate member
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (member.is_banned) {
    throw new HttpException("Account is banned", 403);
  }
  // Calculate expiration times
  const accessExpires = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  // Generate new tokens
  const newAccessToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // Update session with new tokens and expiration
  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // Convert member data to response format
  const memberData: IDiscussionBoardMember.IAuthorized = {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    bio: member.bio,
    role: typia.assert<"guest" | "member" | "admin" | "superAdmin">(
      member.role,
    ),
    is_banned: member.is_banned,
    ban_reason: member.ban_reason,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
  return memberData;
}
