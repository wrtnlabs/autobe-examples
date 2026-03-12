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
  // 1. Verify and decode refresh token
  let decoded: {
    type: "member";
    id: string;
    session_id: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as any as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session exists and is active
  const session =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        multi_user_todo_member_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate member account exists and is not deleted
  const member =
    await MyGlobal.prisma.multi_user_todo_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Generate new tokens with the SAME session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const tokens = {
    access: jwt.sign(
      {
        type: "member",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Update session expiration
  await MyGlobal.prisma.multi_user_todo_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 6. Return new tokens with member info
  return {
    id: member.id as unknown as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    display_name: member.display_name,
    created_at: toISOStringSafe(member.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(member.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: tokens.access,
      refresh: tokens.refresh,
      expired_at: tokens.expired_at as string & tags.Format<"date-time">,
      refreshable_until: tokens.refreshable_until as string &
        tags.Format<"date-time">,
    },
  };
}
