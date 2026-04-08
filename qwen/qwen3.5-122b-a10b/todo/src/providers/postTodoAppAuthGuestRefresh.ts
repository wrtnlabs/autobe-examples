import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppAuthGuestRefresh(props: {
  body: ITodoAppGuest.IRefresh;
}): Promise<ITodoAppGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    type: string;
    id: string;
    session_id: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(props.body.token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      type: string;
      id: string;
      session_id: string;
      created_at: string;
    };
  } catch {
    throw new HttpException("Invalid or expired token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and not expired
  const session = await MyGlobal.prisma.todo_app_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  // Check if session has expired
  const now = new Date();
  if (new Date(session.expired_at) <= now) {
    throw new HttpException("Session expired", 401);
  }
  // 4. Validate guest account exists and not deleted
  const guest = await MyGlobal.prisma.todo_app_guests.findUnique({
    where: { id: decoded.id },
  });
  if (!guest) {
    throw new HttpException("Guest account not found", 401);
  }
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 5. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.todo_app_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return authorized response
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    deleted_at: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
