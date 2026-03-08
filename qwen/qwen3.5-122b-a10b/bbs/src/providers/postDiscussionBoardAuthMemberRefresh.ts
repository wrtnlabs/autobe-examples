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
  // 1. Verify refresh token signature
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
    created_at: string & tags.Format<"date-time">;
  };
  try {
    decoded = typia.assert<{
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "member";
      created_at: string & tags.Format<"date-time">;
    }>(
      jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_member_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check session expiration
  const sessionExpiredAt = new Date(session.expired_at);
  const now = new Date();
  if (sessionExpiredAt <= now) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate member account exists and is not deleted
  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Check member ban status
  if (member.ban_status === "banned") {
    throw new HttpException("Account is banned", 403);
  }
  // 7. Generate new tokens with same session_id
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  // 8. Update session expiration
  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 9. Return member profile with new tokens
  return {
    id: member.id,
    email: member.email,
    displayName: member.display_name,
    bio: member.bio ?? undefined,
    banStatus: member.ban_status,
    banReason: member.ban_reason ?? undefined,
    createdAt: toISOStringSafe(member.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(member.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: null,
    token,
  } satisfies IDiscussionBoardMember.IAuthorized;
}
