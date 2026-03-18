import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { IHrmPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAuthGuestRefresh(props: {
  body: IHrmPlatformGuest.IRefresh;
}): Promise<IHrmPlatformGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    guest_id: string;
    session_id: string;
    type: "guest";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      guest_id: string;
      session_id: string;
      type: "guest";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is not expired
  const now = new Date();
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      guest_id: decoded.guest_id,
      expired_at: { gt: now },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest account exists and is not deleted
  const guest = await MyGlobal.prisma.hrm_platform_guests.findUniqueOrThrow({
    where: { id: decoded.guest_id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 5. Generate new tokens with same session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
  // 6. Update session expiration
  await MyGlobal.prisma.hrm_platform_guest_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpires },
  });
  // 7. Query updated session for response
  const updatedSession =
    await MyGlobal.prisma.hrm_platform_guest_sessions.findUniqueOrThrow({
      where: { id: session.id },
    });
  // 8. Build response with proper typing
  return {
    id: guest.id as string & tags.Format<"uuid">,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(guest.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: null,
    sessions: [
      {
        id: updatedSession.id as string & tags.Format<"uuid">,
        guest_id: updatedSession.guest_id as string & tags.Format<"uuid">,
        ip: updatedSession.ip,
        href: updatedSession.href as string & tags.Format<"uri">,
        referrer: updatedSession.referrer as string & tags.Format<"uri">,
        created_at: toISOStringSafe(updatedSession.created_at) as string &
          tags.Format<"date-time">,
        expired_at: toISOStringSafe(updatedSession.expired_at) as string &
          tags.Format<"date-time">,
      },
    ],
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires) as string &
        tags.Format<"date-time">,
      refreshable_until: toISOStringSafe(refreshExpires) as string &
        tags.Format<"date-time">,
    },
  };
}
