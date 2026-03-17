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
  // 1. Verify and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
    tokenType?: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type matches "guest"
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate tokenType is "refresh" if present
  if (decoded.tokenType && decoded.tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 403);
  }
  // 4. Find guest session with relation property
  const session = await MyGlobal.prisma.todo_app_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      guest: { id: decoded.id },
    },
    select: {
      id: true,
      guest_id: true,
      expired_at: true,
      ip: true,
      href: true,
      referrer: true,
      guest: {
        select: {
          id: true,
          device_fingerprint: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  // 5. Check session expiration
  const nowTimestamp = Date.now();
  const sessionExpiredAt = session.expired_at.getTime();
  if (sessionExpiredAt <= nowTimestamp) {
    throw new HttpException("Session expired", 401);
  }
  // 6. Validate guest account not deleted
  const guest = session.guest;
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 7. Calculate token expiration timestamps
  const accessExpiresTimestamp = nowTimestamp + 60 * 60 * 1000; // 1 hour
  const refreshExpiresTimestamp = nowTimestamp + 7 * 24 * 60 * 60 * 1000; // 7 days
  const accessExpires = toISOStringSafe(new Date(accessExpiresTimestamp));
  const refreshExpires = toISOStringSafe(new Date(refreshExpiresTimestamp));
  const nowISO = toISOStringSafe(new Date(nowTimestamp));
  // 8. Generate new tokens with same session_id
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowISO,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Update session expiration and audit fields
  await MyGlobal.prisma.todo_app_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpiresTimestamp),
      ip: props.body.ip ?? session.ip,
      href: props.body.href,
      referrer: props.body.referrer,
    },
  });
  // 10. Update guest updated_at timestamp
  await MyGlobal.prisma.todo_app_guests.update({
    where: { id: decoded.id },
    data: { updated_at: new Date(nowTimestamp) },
  });
  // 11. Construct and return response with proper typing
  return {
    id: typia.assert<string & tags.Format<"uuid">>(guest.id),
    device_fingerprint: guest.device_fingerprint,
    created_at: typia.assert<string & tags.Format<"date-time">>(
      toISOStringSafe(guest.created_at),
    ),
    updated_at: typia.assert<string & tags.Format<"date-time">>(nowISO),
    deleted_at: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: typia.assert<string & tags.Format<"date-time">>(
        accessExpires,
      ),
      refreshable_until: typia.assert<string & tags.Format<"date-time">>(
        refreshExpires,
      ),
    },
  };
}
