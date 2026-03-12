import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMultiUserTodoAuthGuestRefresh(props: {
  body: IMultiUserTodoGuest.IRefresh;
}): Promise<IMultiUserTodoGuest.IAuthorized> {
  // 1. Decode and verify the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.decode(props.body.refresh_token) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid refresh token", 401);
  }
  // 2. Verify guest exists and is not deleted
  const guest = await MyGlobal.prisma.multi_user_todo_guests.findUniqueOrThrow({
    where: { id: decoded.id },
    select: { id: true, deleted_at: true },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 3. Verify session exists and is not expired
  const session =
    await MyGlobal.prisma.multi_user_todo_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        multi_user_todo_guest_id: decoded.id,
      },
      select: { id: true, expired_at: true },
    });
  if (!session) {
    throw new HttpException("Session not found or expired", 401);
  }
  const now = new Date();
  const sessionExpiredAt = new Date(session.expired_at);
  if (sessionExpiredAt < now) {
    throw new HttpException("Session has expired", 401);
  }
  // 4. Generate new tokens with same session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Update session expiration
  await MyGlobal.prisma.multi_user_todo_guest_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpires },
  });
  return {
    id: guest.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
