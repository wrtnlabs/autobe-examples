import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsAuthGuestRefresh(props: {
  body: IHrmsGuest.IRefresh;
}): Promise<IHrmsGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
  };
  try {
    decoded = typia.assert<{
      id: string;
      session_id: string;
    }>(
      jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      } as jwt.VerifyOptions),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session exists and is active
  const session = await MyGlobal.prisma.hrms_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      hrms_guest_id: decoded.id,
      expired_at: { gt: new Date() },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Validate guest exists and is not deleted
  const guest = await MyGlobal.prisma.hrms_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 4. Calculate new expiration times
  const accessExpiresTime: Date = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresTime: Date = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );
  // 5. Generate new tokens (SAME session_id for continuity)
  const access: string = jwt.sign(
    {
      type: "guest" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" } as jwt.SignOptions,
  );
  const refresh: string = jwt.sign(
    {
      type: "guest" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" } as jwt.SignOptions,
  );
  // 6. Update session expiration timestamp
  await MyGlobal.prisma.hrms_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresTime },
  });
  // 7. Build authorization token
  const token: IAuthorizationToken = {
    access: access,
    refresh: refresh,
    expired_at: toISOStringSafe(accessExpiresTime),
    refreshable_until: toISOStringSafe(refreshExpiresTime),
  };
  // 8. Return new token pair with guest info
  return {
    id: guest.id as string & tags.Format<"uuid">,
    device_fingerprint: guest.device_fingerprint,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    access: access,
    refresh: refresh,
    expired_at: toISOStringSafe(accessExpiresTime),
    token: token,
  } satisfies IHrmsGuest.IAuthorized;
}
