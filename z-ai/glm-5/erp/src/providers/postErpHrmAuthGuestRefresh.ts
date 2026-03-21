import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmGuestTransformer } from "../transformers/ErpHrmGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthGuestRefresh(props: {
  body: IErpHrmGuest.IRefresh;
}): Promise<IErpHrmGuest.IAuthorized> {
  // 1. Verify refresh token
  const decoded = jwt.verify(
    props.body.refreshToken,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  // 2. Validate decoded payload structure
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    decoded.type !== "guest" ||
    typeof decoded.id !== "string" ||
    typeof decoded.session_id !== "string"
  ) {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and belongs to guest
  const session = await MyGlobal.prisma.erp_hrm_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      erp_hrm_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest exists and not deleted
  const guest = await MyGlobal.prisma.erp_hrm_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 5. Calculate expiration times
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // 6. Generate new tokens (SAME session_id for session continuity)
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString(),
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
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.erp_hrm_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Get guest with sessions using transformer
  const guestWithSessions =
    await MyGlobal.prisma.erp_hrm_guests.findUniqueOrThrow({
      where: { id: decoded.id },
      ...ErpHrmGuestTransformer.select(),
    });
  // 9. Build response with transformed guest data
  const transformedGuest =
    await ErpHrmGuestTransformer.transform(guestWithSessions);
  return {
    id: transformedGuest.id,
    fingerprint: transformedGuest.fingerprint,
    sessions: transformedGuest.sessions,
    created_at: transformedGuest.created_at,
    updated_at: transformedGuest.updated_at,
    deleted_at: transformedGuest.deleted_at,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies IErpHrmGuest.IAuthorized;
}
