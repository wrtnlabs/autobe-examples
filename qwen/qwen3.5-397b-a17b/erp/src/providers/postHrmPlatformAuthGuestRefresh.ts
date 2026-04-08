import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
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
  let payload: jwt.JwtPayload;
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified === "string") {
      throw new HttpException("Invalid token format", 401);
    }
    payload = verified;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  const guestId = payload.id;
  const sessionId = payload.session_id;
  const tokenType = payload.type;
  if (tokenType !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  const session = await MyGlobal.prisma.hrm_platform_guest_sessions.findFirst({
    where: {
      id: sessionId,
      hrm_platform_guest_id: guestId,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const guest = await MyGlobal.prisma.hrm_platform_guests.findUnique({
    where: { id: guestId },
  });
  if (!guest || guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 401);
  }
  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const access = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: guestId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  await MyGlobal.prisma.hrm_platform_guest_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: refreshExpiresAt,
    },
  });
  return {
    id: guestId,
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpiresAt.toISOString(),
      refreshable_until: refreshExpiresAt.toISOString(),
    },
  };
}
