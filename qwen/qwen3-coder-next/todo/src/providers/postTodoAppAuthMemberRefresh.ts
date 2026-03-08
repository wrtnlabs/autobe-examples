import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthMemberRefresh(props: {
  body: ITodoAppMemberSession.IRefresh;
}): Promise<ITodoAppMemberSession.IAuthorized> {
  // 1. Verify refresh token signature and payload
  let decoded: {
    id: string;
    session_id: string;
    type: "member";
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
  // 3. Validate session exists and belongs to this member
  const session = await MyGlobal.prisma.todo_app_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_member_id: decoded.id,
      refresh_token: props.body.refresh_token,
      refresh_expires_at: {
        gte: toISOStringSafe(new Date()),
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member not deleted
  await MyGlobal.prisma.todo_app_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 5. Generate new tokens (same session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session with new tokens and expiration
  await MyGlobal.prisma.todo_app_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      access_expires_at: toISOStringSafe(accessExpires),
      refresh_expires_at: toISOStringSafe(refreshExpires),
      expired_at: toISOStringSafe(refreshExpires),
      updated_at: toISOStringSafe(new Date()),
      last_used_at: toISOStringSafe(new Date()),
    },
  });
  // 7. Return authorized session with tokens
  return {
    id: session.id,
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    access_expires_at: toISOStringSafe(accessExpires),
    refresh_expires_at: toISOStringSafe(refreshExpires),
    ip: session.ip,
    user_agent: session.user_agent,
    referrer: session.referrer,
    last_used_at: session.last_used_at
      ? toISOStringSafe(session.last_used_at)
      : toISOStringSafe(new Date()),
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(new Date()),
    expired_at: toISOStringSafe(refreshExpires),
    user: {
      id: session.id,
      todo_app_member_id: session.todo_app_member_id,
      last_used_at: session.last_used_at
        ? toISOStringSafe(session.last_used_at)
        : toISOStringSafe(new Date()),
      created_at: toISOStringSafe(session.created_at),
    },
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
