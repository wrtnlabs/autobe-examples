import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserRefresh";
import { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

export async function postAuthGuestUserRefresh(props: {
  guestUser: GuestuserPayload;
  body: ITodoAppGuestUserRefresh.IRequest;
}): Promise<ITodoAppGuestUser.IAuthorized> {
  // 1. Decode and verify the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "guestUser" | string;
    tokenType?: string;
    created_at?: string;
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as {
      id: string;
      session_id: string;
      type: "guestUser" | string;
      tokenType?: string;
      created_at?: string;
    };
  } catch (_error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "guestUser") {
    throw new HttpException("Invalid token type", 403);
  }

  // 2. Validate that the session exists and is active
  const session = await MyGlobal.prisma.todo_app_guestuser_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_guestuser_id: decoded.id,
    },
  });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  if (session.expired_at !== null) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // 3. Validate guest identity and status
  const guest = await MyGlobal.prisma.todo_app_guestusers.findFirst({
    where: {
      id: decoded.id,
      status: "active",
    },
  });

  if (!guest) {
    throw new HttpException("Guest identity is not active", 403);
  }

  // 4. Compute new expiration timestamps as ISO date-time strings
  const nowMillis = Date.now();
  const accessExpiresMillis = nowMillis + 60 * 60 * 1000; // 1 hour
  const refreshExpiresMillis = nowMillis + 7 * 24 * 60 * 60 * 1000; // 7 days

  const accessExpiresIso = toISOStringSafe(new Date(accessExpiresMillis));
  const refreshExpiresIso = toISOStringSafe(new Date(refreshExpiresMillis));
  const createdAtIso = toISOStringSafe(new Date());

  // 5. Generate new JWT tokens reusing the same session id and guest id
  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAtIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 6. Update session record with new navigation context and extended expiry
  const updatedSession =
    await MyGlobal.prisma.todo_app_guestuser_sessions.update({
      where: {
        id: decoded.session_id,
      },
      data: {
        ip: props.body.ip ?? session.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: new Date(refreshExpiresMillis),
      },
    });

  // 7. Build guest summary DTO from guest row
  const guestSummary: ITodoAppGuestUser.ISummary = {
    id: guest.id,
    external_reference:
      guest.external_reference === null ? null : guest.external_reference,
    display_name: guest.display_name === null ? null : guest.display_name,
    status: guest.status,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
  };

  // 8. Build session summary DTO from updated session row
  const sessionSummary: ITodoAppGuestUserSession.ISummary = {
    id: updatedSession.id,
    guestUser: guestSummary,
    ip: updatedSession.ip,
    href: updatedSession.href,
    referrer: updatedSession.referrer,
    created_at: toISOStringSafe(updatedSession.created_at),
    expired_at:
      updatedSession.expired_at === null
        ? null
        : toISOStringSafe(updatedSession.expired_at),
  };

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpiresIso,
    refreshable_until: refreshExpiresIso,
  };

  return {
    token,
    guest: guestSummary,
    session: sessionSummary,
  };
}
