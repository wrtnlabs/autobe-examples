import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthMemberRefresh(props: {
  body: IMultiUserTodoMember.IRefresh;
}): Promise<IMultiUserTodoMember.IAuthorized> {
  // Find session by refresh token
  const session =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findFirst({
      where: {
        refresh_token: props.body.refreshToken,
      },
      select: {
        id: true,
        multi_user_todo_member_id: true,
        expired_at: true,
        member: {
          select: {
            id: true,
            email: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Check if session is expired
  const now = toISOStringSafe(new Date());
  if (toISOStringSafe(session.expired_at) <= now) {
    throw new HttpException("Session has expired", 401);
  }
  // Check if member is deleted
  if (session.member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Calculate new expiration times
  const nowDate = new Date();
  const accessExpires = new Date(nowDate.getTime() + 15 * 60 * 1000);
  const refreshExpires = new Date(nowDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Generate new tokens with same session_id
  const accessToken = jwt.sign(
    {
      type: "member",
      id: session.member.id,
      session_id: session.id,
      created_at: toISOStringSafe(nowDate),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: session.member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(nowDate),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session with new tokens and expiration
  await MyGlobal.prisma.multi_user_todo_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // Return authorized member response
  return {
    id: session.member.id as string & tags.Format<"uuid">,
    email: session.member.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(session.member.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(session.member.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  };
}
