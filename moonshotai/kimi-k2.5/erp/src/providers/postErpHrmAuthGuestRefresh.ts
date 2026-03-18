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
  // Verify refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as unknown as {
      id: string & tags.Format<"uuid">;
      session_id: string & tags.Format<"uuid">;
      type: "guest";
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate session exists and not expired
  const session = await MyGlobal.prisma.erp_hrm_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      guest_id: decoded.id,
      expired_at: { gt: new Date() },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate guest exists and not expired
  const guest = await MyGlobal.prisma.erp_hrm_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.expired_at.getTime() < Date.now()) {
    throw new HttpException("Guest account has expired", 403);
  }
  // Calculate expiration times
  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000);
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000);
  const nowISO = new Date(now).toISOString();
  // Generate new tokens with same session_id
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
  // Update session expiration
  await MyGlobal.prisma.erp_hrm_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  const result: IErpHrmGuest.IAuthorized = {
    id: decoded.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
  return result;
}
