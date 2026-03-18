import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthGuestRefresh(props: {
  body: IErpHrmGuest.IRefresh;
}): Promise<IErpHrmGuest.IAuthorized> {
  // 1. Decode and verify the refresh token
  let rawDecoded: string | jwt.JwtPayload;
  try {
    rawDecoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate payload shape and type
  if (
    typeof rawDecoded === "string" ||
    typeof rawDecoded.id !== "string" ||
    typeof rawDecoded.session_id !== "string" ||
    rawDecoded.type !== "guest"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }
  const guestId: string = rawDecoded.id;
  const sessionId: string = rawDecoded.session_id;
  // 3. Find the session record
  const session = await MyGlobal.prisma.erp_hrm_guest_sessions.findFirst({
    where: { id: sessionId },
    select: {
      id: true,
      erp_hrm_guest_id: true,
      ip: true,
      href: true,
      referrer: true,
      expired_at: true,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or revoked", 401);
  }
  // 4. Check session expiration (expired_at is a Date from Prisma)
  if (session.expired_at.getTime() <= Date.now()) {
    throw new HttpException("Session expired", 401);
  }
  // 5. Load the associated guest record
  const guest = await MyGlobal.prisma.erp_hrm_guests.findUniqueOrThrow({
    where: { id: session.erp_hrm_guest_id },
    select: {
      id: true,
      fingerprint: true,
      created_at: true,
    },
  });
  // 6. Generate new session UUID and token expiry times
  const newSessionId: string & tags.Format<"uuid"> = v4();
  const nowMs = Date.now();
  const accessExpiresDate = new Date(nowMs + 60 * 60 * 1000); // 1h
  const refreshExpiresDate = new Date(nowMs + 7 * 24 * 60 * 60 * 1000); // 7d
  const nowIso = new Date(nowMs).toISOString();
  const accessExpiresIso: string & tags.Format<"date-time"> =
    accessExpiresDate.toISOString();
  const refreshExpiresIso: string & tags.Format<"date-time"> =
    refreshExpiresDate.toISOString();
  // 7. Generate new tokens (new session_id for rotation)
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: newSessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: newSessionId,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Create new session record (append-only audit trail)
  await MyGlobal.prisma.erp_hrm_guest_sessions.create({
    data: {
      id: newSessionId,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: new Date(nowMs),
      expired_at: refreshExpiresDate,
      guest: { connect: { id: guest.id } },
    },
  });
  // 9. Return authorized guest response
  return {
    id: guest.id,
    fingerprint: guest.fingerprint,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    } satisfies IAuthorizationToken,
    created_at: guest.created_at.toISOString(),
  } satisfies IErpHrmGuest.IAuthorized;
}
