import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postPrivateTodoAppAuthGuestRefresh(props: {
  body: IPrivateTodoAppGuest.IRefresh;
}): Promise<IPrivateTodoAppGuest.IAuthorized> {
  // 1. Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is not expired
  const session =
    await MyGlobal.prisma.private_todo_app_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        private_todo_app_guest_id: decoded.id,
        expired_at: { gt: new Date() },
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest exists and not deleted
  const guest = await MyGlobal.prisma.private_todo_app_guests.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 5. Generate new tokens (SAME session_id for session continuity)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
  const refreshExpires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "2h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.private_todo_app_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return response with new tokens
  return {
    id: guest.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
