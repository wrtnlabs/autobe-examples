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
  // 1. Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
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
  // 2. Validate token type is guest
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type for guest refresh", 403);
  }
  // 3. Validate session exists and is not expired
  const session =
    await MyGlobal.prisma.multi_user_todo_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        multi_user_todo_guest_id: decoded.id,
        expired_at: {
          gt: new Date(),
        },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest exists and is not soft-deleted
  const guest = await MyGlobal.prisma.multi_user_todo_guests.findUnique({
    where: { id: decoded.id },
  });
  if (!guest || guest.deleted_at !== null) {
    throw new HttpException("Guest account not found or has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id for continuity
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expired_at to refresh token expiration
  await MyGlobal.prisma.multi_user_todo_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return authorized response
  return {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    id: guest.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
