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
  // 1. Verify the refresh token
  let decoded: {
    type: string;
    id: string;
    session_id: string;
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
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and not expired
  const session =
    await MyGlobal.prisma.multi_user_todo_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        multi_user_todo_member_id: decoded.id,
        expired_at: { gt: new Date() },
      },
      select: {
        id: true,
        multi_user_todo_member_id: true,
        refresh_token: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member not deleted
  const member = await MyGlobal.prisma.multi_user_todo_members.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      display_name: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!member) {
    throw new HttpException("Member not found", 404);
  }
  // 5. Generate new tokens (SAME session_id)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const newAccessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens and extended expiration
  await MyGlobal.prisma.multi_user_todo_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // 7. Return member info with new tokens
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    created_at: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: member.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
