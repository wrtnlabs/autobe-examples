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
  // 1. Verify the refresh token (no 'as' assertions)
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Narrow payload type and validate claims without 'as'
  if (
    typeof payload === "string" ||
    payload === null ||
    typeof payload["id"] !== "string" ||
    typeof payload["session_id"] !== "string" ||
    typeof payload["type"] !== "string"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }
  const guestId: string = payload["id"];
  const sessionId: string = payload["session_id"];
  const tokenType: string = payload["type"];
  // 3. Validate token type
  if (tokenType !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 4. Look up the guest record
  const guest = await MyGlobal.prisma.todo_app_guests.findUniqueOrThrow({
    where: { id: guestId },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 5. Look up the session and verify it is still valid
  const session = await MyGlobal.prisma.todo_app_guest_sessions.findFirst({
    where: {
      id: sessionId,
      todo_app_guest_id: guestId,
    },
    select: {
      id: true,
      expired_at: true,
    },
  });
  if (!session || session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 6. Generate new token pair (reuse SAME session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const newAccessToken: string = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken: string = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Insert a new session row (append-only audit trail)
  await MyGlobal.prisma.todo_app_guest_sessions.create({
    data: {
      id: v4(),
      ip: "",
      href: "",
      referrer: null,
      created_at: new Date(),
      expired_at: refreshExpires,
      guest: { connect: { id: guestId } },
    },
  });
  // 8. Return the authorized guest response
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken,
    created_at: guest.created_at.toISOString(),
    updated_at: guest.updated_at.toISOString(),
  } satisfies ITodoAppGuest.IAuthorized;
}
